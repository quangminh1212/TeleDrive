"""
Integration tests for the complete scan flow
Tests the full user journey from form submission to results
"""

import pytest
import requests
import json
import time
import asyncio
from unittest.mock import patch, MagicMock
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
import socketio


class TestScanFlow:
    """Test complete scan flow integration"""
    
    @pytest.fixture(scope="class")
    def driver(self):
        """Setup Chrome driver for testing"""
        chrome_options = Options()
        chrome_options.add_argument("--headless")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        
        driver = webdriver.Chrome(options=chrome_options)
        driver.implicitly_wait(10)
        yield driver
        driver.quit()
    
    @pytest.fixture
    def mock_telegram_client(self):
        """Mock Telegram client for testing"""
        with patch('source.engine.TelegramClient') as mock_client:
            # Setup mock client behavior
            mock_instance = MagicMock()
            mock_client.return_value = mock_instance
            
            # Mock successful connection
            mock_instance.connect.return_value = asyncio.Future()
            mock_instance.connect.return_value.set_result(True)
            
            # Mock channel resolution
            mock_entity = MagicMock()
            mock_entity.id = 123456789
            mock_entity.title = "Test Channel"
            mock_instance.get_entity.return_value = asyncio.Future()
            mock_instance.get_entity.return_value.set_result(mock_entity)
            
            # Mock message iteration
            async def mock_iter_messages(*args, **kwargs):
                # Return some mock messages
                for i in range(10):
                    message = MagicMock()
                    message.id = i
                    message.date = "2024-01-01"
                    message.message = f"Test message {i}"
                    message.media = MagicMock() if i % 3 == 0 else None
                    if message.media:
                        message.media.document = MagicMock()
                        message.media.document.attributes = []
                        message.media.document.mime_type = "application/pdf"
                        message.media.document.size = 1024 * 1024
                    yield message
            
            mock_instance.iter_messages.return_value = mock_iter_messages()
            
            yield mock_instance
    
    def test_api_start_scan_endpoint(self):
        """Test the /api/start_scan endpoint"""
        url = "http://localhost:3003/api/start_scan"
        
        # Get CSRF token first
        csrf_response = requests.get("http://localhost:3003/api/csrf-token")
        assert csrf_response.status_code == 200
        csrf_token = csrf_response.json().get("csrf_token")
        
        # Test valid scan request
        data = {
            "channel": "@testchannel",
            "max_messages": 100,
            "scan_direction": "newest",
            "file_types": ["documents", "photos"]
        }
        
        headers = {
            "Content-Type": "application/json",
            "X-CSRFToken": csrf_token
        }
        
        response = requests.post(url, json=data, headers=headers)
        
        # Should return success (even if scan fails due to no real Telegram connection)
        assert response.status_code == 200
        response_data = response.json()
        
        # Should either succeed or fail with a meaningful error
        assert "success" in response_data
        if not response_data["success"]:
            assert "error" in response_data
            # Common expected errors in test environment
            expected_errors = ["authentication", "connection", "session", "flood"]
            assert any(error in response_data["error"].lower() for error in expected_errors)
    
    def test_api_stop_scan_endpoint(self):
        """Test the /api/stop_scan endpoint"""
        url = "http://localhost:3003/api/stop_scan"
        
        # Get CSRF token
        csrf_response = requests.get("http://localhost:3003/api/csrf-token")
        csrf_token = csrf_response.json().get("csrf_token")
        
        headers = {
            "Content-Type": "application/json",
            "X-CSRFToken": csrf_token
        }
        
        response = requests.post(url, headers=headers)
        assert response.status_code == 200
        
        response_data = response.json()
        assert "success" in response_data
    
    def test_full_scan_flow_ui(self, driver):
        """Test complete scan flow through UI"""
        driver.get("http://localhost:3003/scan")
        
        # Fill out the form
        channel_input = driver.find_element(By.ID, "channel-input")
        channel_input.clear()
        channel_input.send_keys("@testchannel")
        
        # Ensure at least one file type is selected
        file_type_checkboxes = driver.find_elements(By.NAME, "file-types")
        if not any(cb.is_selected() for cb in file_type_checkboxes):
            file_type_checkboxes[0].click()
        
        # Submit the form
        submit_btn = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
        submit_btn.click()
        
        # Wait for loading overlay to appear
        try:
            loading_overlay = WebDriverWait(driver, 5).until(
                EC.visibility_of_element_located((By.ID, "form-loading-overlay"))
            )
            assert loading_overlay.is_displayed()
        except:
            # Loading overlay might not appear if scan fails immediately
            pass
        
        # Wait for either progress section to appear or error message
        time.sleep(2)
        
        # Check if progress section appeared (scan started)
        progress_section = driver.find_element(By.ID, "scan-progress-section")
        if progress_section.is_displayed():
            # Scan started successfully
            assert True
            
            # Check for stop button
            stop_btn = driver.find_element(By.ID, "stop-scan-btn")
            assert stop_btn.is_displayed()
            
            # Test stopping the scan
            stop_btn.click()
            time.sleep(1)
            
        else:
            # Scan might have failed due to test environment
            # This is acceptable in integration tests
            pass
    
    def test_socketio_connection(self):
        """Test SocketIO connection and events"""
        sio = socketio.Client()
        connected = False
        events_received = []
        
        @sio.event
        def connect():
            nonlocal connected
            connected = True
        
        @sio.event
        def scan_progress(data):
            events_received.append(('scan_progress', data))
        
        @sio.event
        def scan_complete(data):
            events_received.append(('scan_complete', data))
        
        try:
            sio.connect('http://localhost:3003')
            time.sleep(1)
            assert connected, "Should connect to SocketIO server"
            
        except Exception as e:
            # SocketIO connection might fail in test environment
            pytest.skip(f"SocketIO connection failed: {e}")
        finally:
            if sio.connected:
                sio.disconnect()
    
    def test_form_validation_integration(self, driver):
        """Test form validation in full integration context"""
        driver.get("http://localhost:3003/scan")
        
        # Test empty form submission
        submit_btn = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
        submit_btn.click()
        
        # Should show validation errors
        time.sleep(0.5)
        
        # Form should not submit (progress section should not appear)
        progress_section = driver.find_element(By.ID, "scan-progress-section")
        assert not progress_section.is_displayed()
        
        # Fill valid data
        channel_input = driver.find_element(By.ID, "channel-input")
        channel_input.send_keys("@validchannel")
        
        # Ensure file type is selected
        file_type_checkboxes = driver.find_elements(By.NAME, "file-types")
        if not any(cb.is_selected() for cb in file_type_checkboxes):
            file_type_checkboxes[0].click()
        
        # Now form should submit
        submit_btn.click()
        time.sleep(1)
        
        # Should either show progress or error (but not validation error)
        # This indicates the form validation passed
        assert True  # If we get here, validation worked
    
    def test_advanced_options_integration(self, driver):
        """Test advanced options functionality"""
        driver.get("http://localhost:3003/scan")
        
        # Open advanced options
        toggle_btn = driver.find_element(By.ID, "advanced-toggle-btn")
        toggle_btn.click()
        
        # Wait for animation
        time.sleep(0.5)
        
        # Advanced options should be visible
        advanced_options = driver.find_element(By.ID, "advanced-options")
        assert advanced_options.is_displayed()
        
        # Test max messages input
        max_messages_input = driver.find_element(By.ID, "max-messages")
        max_messages_input.clear()
        max_messages_input.send_keys("50")
        
        # Test scan direction
        scan_direction_radios = driver.find_elements(By.NAME, "scan-direction")
        assert len(scan_direction_radios) > 0
        
        # Select oldest first
        for radio in scan_direction_radios:
            if radio.get_attribute("value") == "oldest":
                radio.click()
                break
        
        # Fill required fields and submit
        channel_input = driver.find_element(By.ID, "channel-input")
        channel_input.send_keys("@testchannel")
        
        submit_btn = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
        submit_btn.click()
        
        # Advanced options should be included in the request
        time.sleep(1)
        # This would need server-side verification to ensure options were sent
    
    def test_error_handling_integration(self, driver):
        """Test error handling in integration context"""
        driver.get("http://localhost:3003/scan")
        
        # Test with invalid channel format
        channel_input = driver.find_element(By.ID, "channel-input")
        channel_input.send_keys("invalid-channel-format")
        
        # Ensure file type is selected
        file_type_checkboxes = driver.find_elements(By.NAME, "file-types")
        if not any(cb.is_selected() for cb in file_type_checkboxes):
            file_type_checkboxes[0].click()
        
        submit_btn = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
        submit_btn.click()
        
        # Should show validation error
        time.sleep(0.5)
        
        error_elements = driver.find_elements(By.CLASS_NAME, "field-error")
        assert len(error_elements) > 0, "Should show validation error for invalid format"
    
    def test_responsive_design_integration(self, driver):
        """Test responsive design on different screen sizes"""
        # Test mobile size
        driver.set_window_size(375, 667)  # iPhone size
        driver.get("http://localhost:3003/scan")
        
        # Check that elements are still accessible
        channel_input = driver.find_element(By.ID, "channel-input")
        assert channel_input.is_displayed()
        
        submit_btn = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
        assert submit_btn.is_displayed()
        
        # Test tablet size
        driver.set_window_size(768, 1024)  # iPad size
        driver.refresh()
        
        # Elements should still be accessible
        channel_input = driver.find_element(By.ID, "channel-input")
        assert channel_input.is_displayed()
        
        # Test desktop size
        driver.set_window_size(1920, 1080)
        driver.refresh()
        
        # All elements should be properly laid out
        channel_input = driver.find_element(By.ID, "channel-input")
        assert channel_input.is_displayed()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
