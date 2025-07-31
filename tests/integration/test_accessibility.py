"""
Accessibility tests for the scan form
Tests WCAG compliance and screen reader compatibility
"""

import pytest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.keys import Keys
import time


class TestAccessibility:
    """Test accessibility compliance"""
    
    @pytest.fixture(scope="class")
    def driver(self):
        """Setup Chrome driver for accessibility testing"""
        chrome_options = Options()
        chrome_options.add_argument("--headless")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        
        driver = webdriver.Chrome(options=chrome_options)
        driver.implicitly_wait(10)
        yield driver
        driver.quit()
    
    def test_semantic_html_structure(self, driver):
        """Test that proper semantic HTML is used"""
        driver.get("http://localhost:3003/scan")
        
        # Check for proper heading hierarchy
        h1_elements = driver.find_elements(By.TAG_NAME, "h1")
        assert len(h1_elements) >= 1, "Page should have at least one h1 element"
        
        # Check for proper form structure
        form = driver.find_element(By.ID, "scan-form")
        assert form.tag_name == "form", "Scan form should use form element"
        
        # Check for fieldset and legend for file types
        fieldset = driver.find_element(By.CSS_SELECTOR, "fieldset")
        legend = fieldset.find_element(By.TAG_NAME, "legend")
        assert legend is not None, "Fieldset should have legend"
    
    def test_aria_labels_and_attributes(self, driver):
        """Test ARIA labels and attributes"""
        driver.get("http://localhost:3003/scan")
        
        # Check channel input ARIA attributes
        channel_input = driver.find_element(By.ID, "channel-input")
        assert channel_input.get_attribute("aria-describedby") == "channel-help"
        assert channel_input.get_attribute("aria-label") is not None
        
        # Check advanced options toggle
        toggle_btn = driver.find_element(By.ID, "advanced-toggle-btn")
        assert toggle_btn.get_attribute("aria-expanded") in ["true", "false"]
        assert toggle_btn.get_attribute("aria-controls") == "advanced-options"
        assert toggle_btn.get_attribute("aria-label") is not None
        
        # Check file types group
        file_types_grid = driver.find_element(By.CLASS_NAME, "file-types-grid")
        assert file_types_grid.get_attribute("role") == "group"
        assert file_types_grid.get_attribute("aria-label") is not None
    
    def test_keyboard_navigation(self, driver):
        """Test full keyboard navigation"""
        driver.get("http://localhost:3003/scan")
        
        # Start with channel input
        channel_input = driver.find_element(By.ID, "channel-input")
        channel_input.click()
        
        # Tab through all focusable elements
        focusable_elements = driver.execute_script("""
            return Array.from(document.querySelectorAll(
                'input, button, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'
            )).filter(el => !el.disabled && el.offsetParent !== null);
        """)
        
        assert len(focusable_elements) > 0, "Should have focusable elements"
        
        # Test that all elements can receive focus
        for i in range(min(5, len(focusable_elements))):  # Test first 5 elements
            element = focusable_elements[i]
            driver.execute_script("arguments[0].focus();", element)
            active_element = driver.switch_to.active_element
            assert active_element == element, f"Element {i} should be focusable"
    
    def test_focus_indicators(self, driver):
        """Test that focus indicators are visible"""
        driver.get("http://localhost:3003/scan")
        
        # Test channel input focus
        channel_input = driver.find_element(By.ID, "channel-input")
        channel_input.click()
        
        # Check that focus styles are applied
        outline = channel_input.value_of_css_property("outline")
        box_shadow = channel_input.value_of_css_property("box-shadow")
        
        # Should have either outline or box-shadow for focus indication
        has_focus_indicator = (
            outline != "none" and outline != "0px" or
            box_shadow != "none" and "rgba" in box_shadow
        )
        assert has_focus_indicator, "Input should have visible focus indicator"
    
    def test_color_contrast(self, driver):
        """Test color contrast ratios (basic check)"""
        driver.get("http://localhost:3003/scan")
        
        # Test submit button contrast
        submit_btn = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
        
        # Get computed styles
        bg_color = submit_btn.value_of_css_property("background-color")
        text_color = submit_btn.value_of_css_property("color")
        
        # Basic check - should not be the same color
        assert bg_color != text_color, "Button background and text should have different colors"
        
        # Check that colors are not transparent
        assert "rgba(0, 0, 0, 0)" not in bg_color, "Button should have visible background"
        assert "rgba(0, 0, 0, 0)" not in text_color, "Button should have visible text"
    
    def test_form_labels(self, driver):
        """Test that all form inputs have proper labels"""
        driver.get("http://localhost:3003/scan")
        
        # Check channel input label
        channel_input = driver.find_element(By.ID, "channel-input")
        label = driver.find_element(By.CSS_SELECTOR, "label[for='channel-input']")
        assert label is not None, "Channel input should have associated label"
        
        # Check that label text is meaningful
        label_text = label.text.strip()
        assert len(label_text) > 0, "Label should have text content"
        assert "channel" in label_text.lower(), "Label should describe the input"
    
    def test_error_message_accessibility(self, driver):
        """Test that error messages are accessible"""
        driver.get("http://localhost:3003/scan")
        
        # Trigger validation error
        channel_input = driver.find_element(By.ID, "channel-input")
        channel_input.send_keys("invalid")
        driver.find_element(By.TAG_NAME, "body").click()
        time.sleep(0.6)
        
        # Check for error message
        error_elements = driver.find_elements(By.CLASS_NAME, "field-error")
        if len(error_elements) > 0:
            error_element = error_elements[0]
            
            # Error should be associated with input
            error_id = error_element.get_attribute("id")
            if error_id:
                aria_describedby = channel_input.get_attribute("aria-describedby")
                assert error_id in aria_describedby, "Error should be referenced by aria-describedby"
            
            # Error should have appropriate role
            role = error_element.get_attribute("role")
            assert role in ["alert", "status", None], "Error should have appropriate role"
    
    def test_skip_links(self, driver):
        """Test skip navigation links"""
        driver.get("http://localhost:3003/scan")
        
        # Look for skip links (might be hidden)
        skip_links = driver.find_elements(By.CLASS_NAME, "skip-link")
        
        # If skip links exist, test them
        if skip_links:
            skip_link = skip_links[0]
            href = skip_link.get_attribute("href")
            assert href and href.startswith("#"), "Skip link should have anchor href"
    
    def test_heading_structure(self, driver):
        """Test proper heading hierarchy"""
        driver.get("http://localhost:3003/scan")
        
        # Get all headings
        headings = driver.find_elements(By.CSS_SELECTOR, "h1, h2, h3, h4, h5, h6")
        
        if len(headings) > 0:
            # First heading should be h1
            first_heading = headings[0]
            assert first_heading.tag_name == "h1", "First heading should be h1"
            
            # Check for logical hierarchy (no skipping levels)
            previous_level = 1
            for heading in headings[1:]:
                current_level = int(heading.tag_name[1])
                assert current_level <= previous_level + 1, f"Heading hierarchy should not skip levels: {previous_level} -> {current_level}"
                previous_level = current_level
    
    def test_button_accessibility(self, driver):
        """Test button accessibility"""
        driver.get("http://localhost:3003/scan")
        
        # Test submit button
        submit_btn = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
        
        # Should have accessible name
        accessible_name = (
            submit_btn.get_attribute("aria-label") or
            submit_btn.text.strip() or
            submit_btn.get_attribute("title")
        )
        assert accessible_name, "Button should have accessible name"
        assert len(accessible_name) > 0, "Button accessible name should not be empty"
        
        # Test toggle button
        toggle_btn = driver.find_element(By.ID, "advanced-toggle-btn")
        toggle_accessible_name = (
            toggle_btn.get_attribute("aria-label") or
            toggle_btn.text.strip()
        )
        assert toggle_accessible_name, "Toggle button should have accessible name"
    
    def test_form_validation_accessibility(self, driver):
        """Test that form validation is accessible"""
        driver.get("http://localhost:3003/scan")
        
        # Submit empty form
        submit_btn = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
        submit_btn.click()
        time.sleep(0.5)
        
        # Check that validation errors are announced
        # This would typically be done with aria-live regions
        live_regions = driver.find_elements(By.CSS_SELECTOR, "[aria-live]")
        
        # If live regions exist, they should have appropriate values
        for region in live_regions:
            aria_live = region.get_attribute("aria-live")
            assert aria_live in ["polite", "assertive"], "Live region should have valid aria-live value"
    
    def test_responsive_accessibility(self, driver):
        """Test accessibility at different screen sizes"""
        sizes = [(375, 667), (768, 1024), (1920, 1080)]
        
        for width, height in sizes:
            driver.set_window_size(width, height)
            driver.get("http://localhost:3003/scan")
            
            # Check that all interactive elements are still accessible
            channel_input = driver.find_element(By.ID, "channel-input")
            assert channel_input.is_displayed(), f"Channel input should be visible at {width}x{height}"
            
            submit_btn = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            assert submit_btn.is_displayed(), f"Submit button should be visible at {width}x{height}"
            
            # Check that touch targets are large enough on mobile
            if width <= 480:
                btn_size = submit_btn.size
                assert btn_size['height'] >= 44, "Touch targets should be at least 44px on mobile"
    
    def test_screen_reader_content(self, driver):
        """Test content specifically for screen readers"""
        driver.get("http://localhost:3003/scan")
        
        # Check for screen reader only content
        sr_only_elements = driver.find_elements(By.CLASS_NAME, "sr-only")
        
        # If screen reader content exists, verify it's properly hidden
        for element in sr_only_elements:
            # Should be visually hidden but available to screen readers
            position = element.value_of_css_property("position")
            clip = element.value_of_css_property("clip")
            
            # Common screen reader only patterns
            is_sr_only = (
                position == "absolute" and "rect(0" in clip or
                element.value_of_css_property("width") == "1px" or
                element.value_of_css_property("height") == "1px"
            )
            
            if not is_sr_only:
                # Alternative: check if it's moved off-screen
                left = element.value_of_css_property("left")
                is_sr_only = "-9999px" in left or "-10000px" in left
            
            assert is_sr_only, "Screen reader only content should be properly hidden"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
