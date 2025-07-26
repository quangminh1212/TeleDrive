/**
 * TeleDrive - Encoding Fix for Vietnamese Characters
 * 
 * This script fixes common encoding issues with Vietnamese text
 * that may occur during data transmission or rendering.
 */

class EncodingFixer {
    constructor() {
        this.init();
    }

    init() {
        // Fix encoding when DOM is loaded
        document.addEventListener('DOMContentLoaded', () => {
            this.fixAllText();
        });

        // Fix encoding for dynamically loaded content
        this.observeChanges();
    }

    /**
     * Fix encoding for all text elements on the page
     */
    fixAllText() {
        const selectors = [
            '.gdrive-file-name',
            '.gdrive-breadcrumb-current',
            '.gdrive-breadcrumb-link',
            '.gdrive-folder-name',
            '.gdrive-current-folder span',
            '[data-filename]',
            '.file-name',
            '.folder-name'
        ];

        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                this.fixElementText(element);
            });
        });
    }

    /**
     * Fix encoding for a specific element
     * @param {HTMLElement} element - Element to fix
     */
    fixElementText(element) {
        if (!element || !element.textContent) return;

        const originalText = element.textContent;
        const fixedText = this.fixVietnameseText(originalText);
        
        if (originalText !== fixedText) {
            element.textContent = fixedText;
            console.log(`[EncodingFix] Fixed: "${originalText}" → "${fixedText}"`);
        }
    }

    /**
     * Fix Vietnamese text encoding issues
     * @param {string} text - Text to fix
     * @returns {string} - Fixed text
     */
    fixVietnameseText(text) {
        if (!text || typeof text !== 'string') return text;

        // Common encoding fixes for Vietnamese
        const fixes = {
            // UTF-8 to Windows-1252 issues
            'Ã¡': 'á', 'Ã ': 'à', 'áº£': 'ả', 'Ã£': 'ã', 'áº¡': 'ạ',
            'Ã©': 'é', 'Ã¨': 'è', 'áº»': 'ẻ', 'áº½': 'ẽ', 'áº¹': 'ẹ',
            'Ã­': 'í', 'Ã¬': 'ì', 'áº¿': 'ỉ', 'Ä©': 'ĩ', 'á»‹': 'ị',
            'Ã³': 'ó', 'Ã²': 'ò', 'á»': 'ỏ', 'Ãµ': 'õ', 'á»': 'ọ',
            'Ãº': 'ú', 'Ã¹': 'ù', 'á»§': 'ủ', 'Å©': 'ũ', 'á»¥': 'ụ',
            'Ã½': 'ý', 'á»³': 'ỳ', 'á»·': 'ỷ', 'á»¹': 'ỹ', 'á»±': 'ỵ',
            
            // Uppercase
            'Ã': 'Á', 'Ã€': 'À', 'áº¢': 'Ả', 'Ãƒ': 'Ã', 'áº ': 'Ạ',
            'Ã‰': 'É', 'Ãˆ': 'È', 'áºº': 'Ẻ', 'áº¼': 'Ẽ', 'áº¸': 'Ẹ',
            'Ã': 'Í', 'ÃŒ': 'Ì', 'áº¾': 'Ỉ', 'Ä¨': 'Ĩ', 'á»Š': 'Ị',
            'Ã"': 'Ó', 'Ã'': 'Ò', 'á»Ž': 'Ỏ', 'Ã•': 'Õ', 'á»Œ': 'Ọ',
            'Ãš': 'Ú', 'Ã™': 'Ù', 'á»¦': 'Ủ', 'Å¨': 'Ũ', 'á»¤': 'Ụ',
            'Ã': 'Ý', 'á»²': 'Ỳ', 'á»¶': 'Ỷ', 'á»¸': 'Ỹ', 'á»°': 'Ỵ',
            
            // Special Vietnamese characters
            'Ä'': 'đ', 'Ä': 'Đ',
            
            // Circumflex and breve combinations
            'Ã¢': 'â', 'Ã¡': 'ấ', 'á»': 'ầ', 'áº©': 'ẩ', 'áº«': 'ẫ', 'áº­': 'ậ',
            'Ã‚': 'Â', 'áº¤': 'Ấ', 'áº¦': 'Ầ', 'áº¨': 'Ẩ', 'áºª': 'Ẫ', 'áº¬': 'Ậ',
            'Äƒ': 'ă', 'áº¯': 'ắ', 'áº±': 'ằ', 'áº³': 'ẳ', 'áºµ': 'ẵ', 'áº·': 'ặ',
            'Ä‚': 'Ă', 'áº®': 'Ắ', 'áº°': 'Ằ', 'áº²': 'Ẳ', 'áº´': 'Ẵ', 'áº¶': 'Ặ',
            
            'Ãª': 'ê', 'áº¿': 'ế', 'á»': 'ề', 'á»ƒ': 'ể', 'á»…': 'ễ', 'á»‡': 'ệ',
            'ÃŠ': 'Ê', 'áº¾': 'Ế', 'á»€': 'Ề', 'á»‚': 'Ể', 'á»„': 'Ễ', 'á»†': 'Ệ',
            
            'Ã´': 'ô', 'á»'': 'ố', 'á»"': 'ồ', 'á»•': 'ổ', 'á»—': 'ỗ', 'á»™': 'ộ',
            'Ã"': 'Ô', 'á»'': 'Ố', 'á»'': 'Ồ', 'á»"': 'Ổ', 'á»–': 'Ỗ', 'á»˜': 'Ộ',
            
            'Æ°': 'ư', 'á»›': 'ứ', 'á»': 'ừ', 'á»Ÿ': 'ử', 'á»¡': 'ữ', 'á»£': 'ự',
            'Æ¯': 'Ư', 'á»š': 'Ứ', 'á»œ': 'Ừ', 'á»ž': 'Ử', 'á» ': 'Ữ', 'á»¢': 'Ự'
        };

        let fixedText = text;
        
        // Apply all fixes
        Object.keys(fixes).forEach(wrong => {
            const correct = fixes[wrong];
            fixedText = fixedText.replace(new RegExp(wrong, 'g'), correct);
        });

        return fixedText;
    }

    /**
     * Observe DOM changes and fix encoding for new content
     */
    observeChanges() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Fix text in the new element and its children
                            this.fixElementText(node);
                            const textElements = node.querySelectorAll('*');
                            textElements.forEach(element => {
                                this.fixElementText(element);
                            });
                        }
                    });
                } else if (mutation.type === 'characterData') {
                    // Fix text content changes
                    const element = mutation.target.parentElement;
                    if (element) {
                        this.fixElementText(element);
                    }
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    /**
     * Manually fix encoding for specific text
     * @param {string} text - Text to fix
     * @returns {string} - Fixed text
     */
    static fixText(text) {
        const fixer = new EncodingFixer();
        return fixer.fixVietnameseText(text);
    }
}

// Initialize the encoding fixer
const encodingFixer = new EncodingFixer();

// Export for use in other scripts
window.EncodingFixer = EncodingFixer;

// Add utility function to window
window.fixVietnameseText = (text) => EncodingFixer.fixText(text);

console.log('[EncodingFixer] Vietnamese text encoding fixer loaded');
