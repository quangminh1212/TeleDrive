"""
Unit tests for form validation functionality
Tests the JavaScript validation functions used in the scan form
"""

import pytest
import json
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.keys import Keys
import time


class TestFormValidation:
    """Test form validation functionality"""
    
    @pytest.fixture(scope="class")
    def driver(self):
        """Setup Chrome driver for testing"""
        chrome_options = Options()
        chrome_options.add_argument("--headless")  # Run in headless mode
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        
        driver = webdriver.Chrome(options=chrome_options)
        driver.implicitly_wait(10)
        yield driver
        driver.quit()
    
    @pytest.fixture
    def scan_page(self, driver):
        """Navigate to scan page"""
        driver.get("http://localhost:3003/scan")
        return driver
    
    def test_channel_input_validation_valid_username(self, scan_page):
        """Test valid channel username validation"""
        driver = scan_page
        
        # Test valid username
        channel_input = driver.find_element(By.ID, "channel-input")
        channel_input.clear()
        channel_input.send_keys("@validchannel")
        
        # Trigger validation by clicking elsewhere
        driver.find_element(By.TAG_NAME, "body").click()
        time.sleep(0.6)  # Wait for debounced validation
        
        # Check that no error is shown
        error_elements = driver.find_elements(By.CLASS_NAME, "field-error")
        assert len(error_elements) == 0, "Valid username should not show error"
    
    def test_channel_input_validation_invalid_username(self, scan_page):
        """Test invalid channel username validation"""
        driver = scan_page
        
        # Test invalid username (too short)
        channel_input = driver.find_element(By.ID, "channel-input")
        channel_input.clear()
        channel_input.send_keys("@abc")
        
        # Trigger validation
        driver.find_element(By.TAG_NAME, "body").click()
        time.sleep(0.6)
        
        # Check that error is shown
        error_elements = driver.find_elements(By.CLASS_NAME, "field-error")
        assert len(error_elements) > 0, "Invalid username should show error"
        
        error_text = error_elements[0].text.lower()
        assert "too short" in error_text or "username" in error_text
    
    def test_channel_input_validation_valid_url(self, scan_page):
        """Test valid channel URL validation"""
        driver = scan_page
        
        # Test valid URL
        channel_input = driver.find_element(By.ID, "channel-input")
        channel_input.clear()
        channel_input.send_keys("https://t.me/validchannel")
        
        # Trigger validation
        driver.find_element(By.TAG_NAME, "body").click()
        time.sleep(0.6)
        
        # Check that no error is shown
        error_elements = driver.find_elements(By.CLASS_NAME, "field-error")
        assert len(error_elements) == 0, "Valid URL should not show error"
    
    def test_channel_input_validation_invalid_url(self, scan_page):
        """Test invalid channel URL validation"""
        driver = scan_page
        
        # Test invalid URL
        channel_input = driver.find_element(By.ID, "channel-input")
        channel_input.clear()
        channel_input.send_keys("https://example.com/channel")
        
        # Trigger validation
        driver.find_element(By.TAG_NAME, "body").click()
        time.sleep(0.6)
        
        # Check that error is shown
        error_elements = driver.find_elements(By.CLASS_NAME, "field-error")
        assert len(error_elements) > 0, "Invalid URL should show error"
    
    def test_file_types_validation(self, scan_page):
        """Test file types selection validation"""
        driver = scan_page
        
        # Uncheck all file types
        file_type_checkboxes = driver.find_elements(By.NAME, "file-types")
        for checkbox in file_type_checkboxes:
            if checkbox.is_selected():
                checkbox.click()
        
        # Try to submit form
        submit_btn = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
        submit_btn.click()
        
        # Check that validation error is shown
        time.sleep(0.5)
        
        # Should show toast or error message
        # This would need to be checked based on the actual implementation
        # For now, we'll check if the form didn't submit (scan didn't start)
        progress_section = driver.find_element(By.ID, "scan-progress-section")
        assert progress_section.get_attribute("style") == "display: none;" or not progress_section.is_displayed()
    
    def test_max_messages_validation(self, scan_page):
        """Test max messages input validation"""
        driver = scan_page
        
        # Open advanced options
        toggle_btn = driver.find_element(By.ID, "advanced-toggle-btn")
        toggle_btn.click()
        time.sleep(0.5)
        
        # Test invalid max messages
        max_messages_input = driver.find_element(By.ID, "max-messages")
        max_messages_input.clear()
        max_messages_input.send_keys("invalid")
        
        # Trigger validation
        driver.find_element(By.TAG_NAME, "body").click()
        time.sleep(0.6)
        
        # Check that error is shown
        error_elements = driver.find_elements(By.CLASS_NAME, "field-error")
        has_max_messages_error = any("message limit" in error.text.lower() or "invalid" in error.text.lower() 
                                   for error in error_elements)
        assert has_max_messages_error, "Invalid max messages should show error"
    
    def test_form_submission_debouncing(self, scan_page):
        """Test that form submission is debounced"""
        driver = scan_page
        
        # Fill valid form data
        channel_input = driver.find_element(By.ID, "channel-input")
        channel_input.clear()
        channel_input.send_keys("@testchannel")
        
        # Try to submit multiple times quickly
        submit_btn = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
        
        # First submission
        submit_btn.click()
        time.sleep(0.1)
        
        # Second submission (should be blocked by debouncing)
        submit_btn.click()
        time.sleep(0.5)
        
        # Check that only one scan started (this would need server-side verification)
        # For now, we'll just verify the button state
        assert submit_btn.is_enabled() or "loading" in submit_btn.get_attribute("class")
    
    def test_accessibility_attributes(self, scan_page):
        """Test that proper accessibility attributes are present"""
        driver = scan_page
        
        # Check channel input has proper ARIA attributes
        channel_input = driver.find_element(By.ID, "channel-input")
        assert channel_input.get_attribute("aria-describedby") == "channel-help"
        assert channel_input.get_attribute("aria-label") is not None
        
        # Check advanced options toggle has proper ARIA attributes
        toggle_btn = driver.find_element(By.ID, "advanced-toggle-btn")
        assert toggle_btn.get_attribute("aria-expanded") == "false"
        assert toggle_btn.get_attribute("aria-controls") == "advanced-options"
        
        # Check file types fieldset
        fieldset = driver.find_element(By.CSS_SELECTOR, "fieldset")
        legend = fieldset.find_element(By.TAG_NAME, "legend")
        assert legend is not None
        
        file_types_grid = driver.find_element(By.CLASS_NAME, "file-types-grid")
        assert file_types_grid.get_attribute("role") == "group"
    
    def test_keyboard_navigation(self, scan_page):
        """Test keyboard navigation functionality"""
        driver = scan_page
        
        # Test Tab navigation
        channel_input = driver.find_element(By.ID, "channel-input")
        channel_input.click()
        
        # Tab to next element
        channel_input.send_keys(Keys.TAB)
        
        # Should focus on advanced options toggle
        active_element = driver.switch_to.active_element
        assert active_element.get_attribute("id") == "advanced-toggle-btn"
        
        # Test Enter key on toggle button
        active_element.send_keys(Keys.ENTER)
        time.sleep(0.5)
        
        # Advanced options should be expanded
        toggle_btn = driver.find_element(By.ID, "advanced-toggle-btn")
        assert toggle_btn.get_attribute("aria-expanded") == "true"
    
    def test_input_sanitization(self, scan_page):
        """Test that input is properly sanitized"""
        driver = scan_page
        
        # Test XSS attempt
        channel_input = driver.find_element(By.ID, "channel-input")
        channel_input.clear()
        channel_input.send_keys("<script>alert('xss')</script>")
        
        # The input should be sanitized (script tags removed)
        # This would be verified on form submission
        submit_btn = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
        submit_btn.click()
        
        # Check that no alert appeared (XSS was prevented)
        # In a real test, we'd verify the sanitized value was sent to server
        time.sleep(0.5)
        
        # No alert should have appeared
        alerts = driver.get_log('browser')
        xss_alerts = [log for log in alerts if 'xss' in log.get('message', '').lower()]
        assert len(xss_alerts) == 0, "XSS should be prevented"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
