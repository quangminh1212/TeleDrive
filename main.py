import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import asyncio
import threading
import os
from telethon import TelegramClient
from telethon.errors import SessionPasswordNeededError
from PIL import Image, ImageTk

# Import logging configuration
from logger_config import get_logger, log_startup_info

# Setup logging and log startup info
logger = get_logger('TeleDrive.Main')
log_startup_info()

# Telegram API credentials
API_ID = 21272067
API_HASH = 'b7690dc86952dbc9b16717b101164af3'
SESSION_NAME = 'teledrive_session'

logger.info(f"🔧 API Configuration - ID: {API_ID}, Session: {SESSION_NAME}")

class TeleDriveApp:
    def __init__(self):
        self.logger = get_logger('TeleDrive.App')
        self.logger.info("🚀 Initializing TeleDrive Application...")

        try:
            # Initialize main window
            self.logger.debug("Creating main window...")
            self.root = tk.Tk()
            self.root.title("TeleDrive - Telegram Channel File Manager")
            self.root.geometry("1000x700")
            self.root.configure(bg='#ffffff')
            self.root.minsize(800, 600)
            self.logger.info("✅ Main window created successfully")

            # Initialize variables
            self.logger.debug("Initializing application variables...")
            self.client = None
            self.loop = None
            self.thread = None
            self.channels = []
            self.current_channel = None
            self.files = []
            self.phone_number = None

            # Create Telegram client
            self.logger.debug("Creating Telegram client...")
            self.client = TelegramClient(SESSION_NAME, API_ID, API_HASH)
            self.logger.info("✅ Telegram client created successfully")

            # Load logo
            self.logger.debug("Loading application logo...")
            self.load_logo()

            # Show initial interface
            self.logger.debug("Showing initial login interface...")
            self.show_login_interface()

            self.logger.info("🎉 TeleDrive initialized successfully!")

        except Exception as e:
            self.logger.error(f"❌ Failed to initialize TeleDrive: {str(e)}", exc_info=True)
            if hasattr(self, 'root'):
                messagebox.showerror("Initialization Error", f"Failed to start TeleDrive:\n{str(e)}")
            raise
        
    def load_logo(self):
        """Load application logo with detailed logging"""
        try:
            logo_path = 'teledrive.png'
            self.logger.debug(f"Checking for logo file: {logo_path}")

            if os.path.exists(logo_path):
                self.logger.debug("Logo file found, loading image...")
                image = Image.open(logo_path)
                original_size = image.size
                self.logger.debug(f"Original logo size: {original_size}")

                # Resize logo
                target_size = (64, 64)
                image = image.resize(target_size, Image.Resampling.LANCZOS)
                self.logo = ImageTk.PhotoImage(image)

                self.logger.info(f"✅ Logo loaded successfully: {logo_path} ({original_size} -> {target_size})")
            else:
                self.logger.warning(f"⚠️ Logo file not found: {logo_path}")
                self.logo = None

        except Exception as e:
            self.logger.error(f"❌ Failed to load logo: {str(e)}", exc_info=True)
            self.logo = None

    def get_example_number(self, country_selection):
        """Get example phone number for selected country"""
        examples = {
            "+84": "912345678",
            "+1": "2025551234",
            "+86": "13812345678",
            "+91": "9876543210",
            "+81": "9012345678",
            "+82": "1012345678",
            "+65": "91234567",
            "+60": "123456789",
            "+66": "812345678",
            "+62": "812345678",
            "+63": "9171234567",
            "+44": "7700900123",
            "+49": "1512345678",
            "+33": "612345678",
            "+39": "3123456789",
            "+34": "612345678",
            "+7": "9123456789",
            "+55": "11987654321",
            "+52": "5512345678",
            "+61": "412345678",
            "+64": "211234567"
        }

        country_code = country_selection.split(' ')[0]
        return examples.get(country_code, "123456789")
    
    def show_login_interface(self):
        """Display login interface with detailed logging"""
        self.logger.info("🔐 Showing login interface...")

        try:
            # Clear existing widgets
            self.logger.debug("Clearing existing widgets...")
            widget_count = len(self.root.winfo_children())
            for widget in self.root.winfo_children():
                widget.destroy()
            self.logger.debug(f"Cleared {widget_count} existing widgets")

            # Create main container
            self.logger.debug("Creating main container...")
            main_container = tk.Frame(self.root, bg='#ffffff')
            main_container.pack(expand=True, fill='both')

            # Create center content frame
            self.logger.debug("Creating center content frame...")
            content_frame = tk.Frame(main_container, bg='#ffffff')
            content_frame.place(relx=0.5, rely=0.5, anchor='center')

            # Create logo section
            self.logger.debug("Creating logo section...")
            if self.logo:
                self.logger.debug("Using loaded logo image")
                logo_label = tk.Label(content_frame, image=self.logo, bg='#ffffff')
                logo_label.pack(pady=(0, 20))
            else:
                self.logger.debug("Using emoji logo fallback")
                logo_label = tk.Label(content_frame, text="📱", font=('Arial', 48),
                                     bg='#ffffff', fg='#0088cc')
                logo_label.pack(pady=(0, 20))

            # Create app title
            self.logger.debug("Creating app title...")
            app_name = tk.Label(content_frame, text="TeleDrive",
                               font=('Arial', 24, 'bold'), bg='#ffffff', fg='#0088cc')
            app_name.pack(pady=(0, 10))

            # Create subtitle
            self.logger.debug("Creating subtitle...")
            subtitle_label = tk.Label(content_frame,
                                     text="Telegram Channel File Manager",
                                     font=('Arial', 12), bg='#ffffff', fg='#666666')
            subtitle_label.pack(pady=(0, 30))

            # Create phone input section
            self.logger.debug("Creating phone input section...")
            phone_frame = tk.Frame(content_frame, bg='#ffffff')
            phone_frame.pack(pady=20)

            tk.Label(phone_frame, text="Phone Number:", font=('Arial', 12),
                    bg='#ffffff').pack(anchor='w', pady=(0, 5))

            # Create phone input container
            phone_input_frame = tk.Frame(phone_frame, bg='#ffffff')
            phone_input_frame.pack(fill='x', pady=(0, 10))

            # Country code dropdown
            self.logger.debug("Creating country code dropdown...")
            country_codes = [
                "+84 (Vietnam)",
                "+1 (USA/Canada)",
                "+86 (China)",
                "+91 (India)",
                "+81 (Japan)",
                "+82 (South Korea)",
                "+65 (Singapore)",
                "+60 (Malaysia)",
                "+66 (Thailand)",
                "+62 (Indonesia)",
                "+63 (Philippines)",
                "+44 (UK)",
                "+49 (Germany)",
                "+33 (France)",
                "+39 (Italy)",
                "+34 (Spain)",
                "+7 (Russia)",
                "+55 (Brazil)",
                "+52 (Mexico)",
                "+61 (Australia)",
                "+64 (New Zealand)"
            ]

            self.country_var = tk.StringVar(value="+84 (Vietnam)")
            self.country_dropdown = ttk.Combobox(
                phone_input_frame,
                textvariable=self.country_var,
                values=country_codes,
                state="readonly",
                width=15,
                font=('Arial', 10)
            )
            self.country_dropdown.pack(side='left', padx=(0, 10))

            # Phone number entry (without country code)
            self.phone_entry = tk.Entry(phone_input_frame, font=('Arial', 12), width=15)
            self.phone_entry.pack(side='left', fill='x', expand=True)

            # Add placeholder functionality
            self.phone_placeholder = "Enter phone number"
            self.phone_entry.insert(0, self.phone_placeholder)
            self.phone_entry.config(fg='#999999')

            # Bind focus events for placeholder
            def on_phone_focus_in(event):
                if self.phone_entry.get() == self.phone_placeholder:
                    self.phone_entry.delete(0, tk.END)
                    self.phone_entry.config(fg='#000000')

            def on_phone_focus_out(event):
                if not self.phone_entry.get():
                    self.phone_entry.insert(0, self.phone_placeholder)
                    self.phone_entry.config(fg='#999999')

            self.phone_entry.bind('<FocusIn>', on_phone_focus_in)
            self.phone_entry.bind('<FocusOut>', on_phone_focus_out)

            # Add example text below input
            example_frame = tk.Frame(phone_frame, bg='#ffffff')
            example_frame.pack(fill='x', pady=(5, 0))

            example_text = self.get_example_number(self.country_var.get())
            self.example_label = tk.Label(example_frame, text=f"Example: {example_text}",
                                         font=('Arial', 9), bg='#ffffff', fg='#666666')
            self.example_label.pack(anchor='w')

            # Update example when country changes
            def on_country_change(event):
                example_text = self.get_example_number(self.country_var.get())
                self.example_label.config(text=f"Example: {example_text}")

            self.country_dropdown.bind('<<ComboboxSelected>>', on_country_change)

            self.logger.debug("Phone input created with country dropdown and number field")

            # Create send code button
            self.logger.debug("Creating send code button...")
            self.start_btn = tk.Button(content_frame, text="Send Code",
                                      font=('Arial', 12, 'bold'),
                                      bg='#0088cc', fg='white',
                                      padx=30, pady=10,
                                      command=self.send_code)
            self.start_btn.pack(pady=20)

            # Create status label
            self.logger.debug("Creating status label...")
            self.status_label = tk.Label(content_frame, text="", font=('Arial', 10),
                                        bg='#ffffff', fg='#ff0000')
            self.status_label.pack(pady=10)

            # Set focus and bind events
            self.logger.debug("Setting focus and binding events...")
            self.phone_entry.focus()
            self.phone_entry.bind('<Return>', lambda e: self.send_code())

            self.logger.info("✅ Login interface created successfully")

        except Exception as e:
            self.logger.error(f"❌ Failed to create login interface: {str(e)}", exc_info=True)
            messagebox.showerror("Interface Error", f"Failed to create login interface:\n{str(e)}")
            raise
    
    def send_code(self):
        """Send verification code to phone number with detailed logging"""
        self.logger.info("📱 Send code button clicked")

        try:
            # Get country code and phone number
            country_selection = self.country_var.get()
            country_code = country_selection.split(' ')[0]  # Extract "+84" from "+84 (Vietnam)"
            phone_number = self.phone_entry.get().strip()

            self.logger.debug(f"Country selected: {country_selection}")
            self.logger.debug(f"Country code: {country_code}")
            self.logger.debug(f"Phone number: {phone_number}")

            # Check if phone number is empty or still placeholder
            if not phone_number or phone_number == self.phone_placeholder:
                self.logger.warning("⚠️ Empty or placeholder phone number entered")
                self.status_label.config(text="Please enter your phone number")
                return

            # Combine country code and phone number
            full_phone = country_code + phone_number
            self.logger.debug(f"Full phone number: {full_phone}")

            # Update UI to show sending state
            self.logger.debug("Updating UI to sending state...")
            self.status_label.config(text="Sending verification code...")
            self.start_btn.config(state='disabled', text="Sending...")
            self.root.update()

            # Start async operations in a separate thread
            self.logger.info(f"🔄 Starting async code sending for: {full_phone}")

            def async_send_code():
                thread_logger = get_logger('TeleDrive.SendCode')
                thread_logger.info(f"📡 Async thread started for phone: {full_phone}")

                try:
                    # Create new event loop for this thread
                    thread_logger.debug("Creating new event loop...")
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)

                    # Connect to Telegram
                    thread_logger.info("🔗 Connecting to Telegram...")
                    loop.run_until_complete(self.client.connect())
                    thread_logger.info("✅ Connected to Telegram successfully")

                    # Send verification code
                    thread_logger.info(f"📤 Sending verification code to: {full_phone}")
                    loop.run_until_complete(self.client.send_code_request(full_phone))
                    thread_logger.info("✅ Verification code sent successfully")

                    # Store phone number and schedule UI update
                    self.phone_number = full_phone
                    thread_logger.debug("Scheduling code interface display...")
                    self.root.after(0, self.show_code_interface)

                except Exception as e:
                    thread_logger.error(f"❌ Failed to send code: {str(e)}", exc_info=True)
                    # Schedule error display on main thread
                    self.root.after(0, lambda: self.show_error(f"Error: {str(e)}"))
                finally:
                    thread_logger.debug("Closing event loop...")
                    loop.close()
                    thread_logger.info("🏁 Async thread completed")

            thread = threading.Thread(target=async_send_code, daemon=True)
            thread.start()
            self.logger.debug("Async thread started successfully")

        except Exception as e:
            self.logger.error(f"❌ Failed to initiate code sending: {str(e)}", exc_info=True)
            self.show_error(f"Failed to send code: {str(e)}")

    def show_error(self, message):
        """Display error message with logging"""
        self.logger.error(f"🚨 Displaying error to user: {message}")
        self.status_label.config(text=message)
        self.start_btn.config(state='normal', text="Send Code")
        self.logger.debug("UI reset to normal state after error")
    
    def show_code_interface(self):
        """Display code verification interface with detailed logging"""
        self.logger.info("🔢 Showing code verification interface...")

        try:
            # Clear existing widgets
            self.logger.debug("Clearing existing widgets...")
            widget_count = len(self.root.winfo_children())
            for widget in self.root.winfo_children():
                widget.destroy()
            self.logger.debug(f"Cleared {widget_count} existing widgets")

            # Create main container
            self.logger.debug("Creating main container...")
            main_container = tk.Frame(self.root, bg='#ffffff')
            main_container.pack(expand=True, fill='both')

            # Create center content frame
            self.logger.debug("Creating center content frame...")
            content_frame = tk.Frame(main_container, bg='#ffffff')
            content_frame.place(relx=0.5, rely=0.5, anchor='center')

            # Create title
            self.logger.debug("Creating title...")
            title_label = tk.Label(content_frame, text="Enter Verification Code",
                                  font=('Arial', 18, 'bold'), bg='#ffffff', fg='#0088cc')
            title_label.pack(pady=(0, 20))

            # Display phone number
            self.logger.debug(f"Displaying phone number: {self.phone_number}")
            phone_label = tk.Label(content_frame, text=f"Code sent to: {self.phone_number}",
                                  font=('Arial', 12), bg='#ffffff', fg='#666666')
            phone_label.pack(pady=(0, 20))

            # Create code input section
            self.logger.debug("Creating code input section...")
            code_frame = tk.Frame(content_frame, bg='#ffffff')
            code_frame.pack(pady=20)

            tk.Label(code_frame, text="Verification Code:", font=('Arial', 12),
                    bg='#ffffff').pack(anchor='w', pady=(0, 5))

            self.code_entry = tk.Entry(code_frame, font=('Arial', 12), width=25)
            self.code_entry.pack(pady=(0, 10))
            self.logger.debug("Code entry field created")

            # Create verify button
            self.logger.debug("Creating verify button...")
            self.verify_btn = tk.Button(content_frame, text="Verify",
                                       font=('Arial', 12, 'bold'),
                                       bg='#0088cc', fg='white',
                                       padx=30, pady=10,
                                       command=self.verify_code)
            self.verify_btn.pack(pady=20)

            # Create status label
            self.logger.debug("Creating status label...")
            self.status_label = tk.Label(content_frame, text="", font=('Arial', 10),
                                        bg='#ffffff', fg='#ff0000')
            self.status_label.pack(pady=10)

            # Set focus and bind events
            self.logger.debug("Setting focus and binding events...")
            self.code_entry.focus()
            self.code_entry.bind('<Return>', lambda e: self.verify_code())

            self.logger.info("✅ Code verification interface created successfully")

        except Exception as e:
            self.logger.error(f"❌ Failed to create code interface: {str(e)}", exc_info=True)
            messagebox.showerror("Interface Error", f"Failed to create code interface:\n{str(e)}")
            raise
    
    def verify_code(self):
        """Verify the entered code with detailed logging"""
        self.logger.info("🔐 Verify code button clicked")

        try:
            # Get and validate code
            code = self.code_entry.get().strip()
            self.logger.debug(f"Verification code entered: {'*' * len(code)} (length: {len(code)})")

            if not code:
                self.logger.warning("⚠️ Empty verification code entered")
                self.status_label.config(text="Please enter the verification code")
                return

            # Update UI to show verifying state
            self.logger.debug("Updating UI to verifying state...")
            self.status_label.config(text="Verifying code...")
            self.verify_btn.config(state='disabled', text="Verifying...")
            self.root.update()

            # Start async operations in a separate thread
            self.logger.info(f"🔄 Starting async code verification for: {self.phone_number}")

            def async_verify_code():
                thread_logger = get_logger('TeleDrive.VerifyCode')
                thread_logger.info(f"🔍 Async verification thread started")

                try:
                    # Create new event loop for this thread
                    thread_logger.debug("Creating new event loop...")
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)

                    # Sign in with code
                    thread_logger.info(f"🔑 Signing in with verification code...")
                    loop.run_until_complete(self.client.sign_in(self.phone_number, code))
                    thread_logger.info("✅ Successfully signed in with verification code")

                    # Schedule UI update on main thread
                    thread_logger.debug("Scheduling main interface display...")
                    self.root.after(0, self.show_main_interface)

                except SessionPasswordNeededError:
                    thread_logger.info("🔒 Two-factor authentication required")
                    # Schedule password interface on main thread
                    self.root.after(0, self.show_password_interface)
                except Exception as e:
                    thread_logger.error(f"❌ Code verification failed: {str(e)}", exc_info=True)
                    # Schedule error display on main thread
                    self.root.after(0, lambda: self.show_verify_error(f"Invalid code: {str(e)}"))
                finally:
                    thread_logger.debug("Closing event loop...")
                    loop.close()
                    thread_logger.info("🏁 Verification thread completed")

            thread = threading.Thread(target=async_verify_code, daemon=True)
            thread.start()
            self.logger.debug("Async verification thread started successfully")

        except Exception as e:
            self.logger.error(f"❌ Failed to initiate code verification: {str(e)}", exc_info=True)
            self.show_verify_error(f"Failed to verify code: {str(e)}")

    def show_verify_error(self, message):
        """Display verification error with logging"""
        self.logger.error(f"🚨 Verification error: {message}")
        self.status_label.config(text=message)
        self.verify_btn.config(state='normal', text="Verify")
        self.code_entry.delete(0, tk.END)
        self.code_entry.focus()
        self.logger.debug("UI reset to normal state after verification error")
    
    def show_password_interface(self):
        """Display 2FA password interface with logging"""
        self.logger.info("🔒 Two-factor authentication required")
        self.logger.warning("⚠️ 2FA not implemented in simplified version")
        messagebox.showinfo("Two-Factor Authentication",
                           "Two-factor authentication is enabled. This simplified version doesn't support 2FA yet.")
        self.logger.debug("Returning to login interface...")
        self.show_login_interface()

    def show_main_interface(self):
        """Display main application interface with detailed logging"""
        self.logger.info("🏠 Showing main application interface...")

        try:
            # Clear existing widgets
            self.logger.debug("Clearing existing widgets...")
            widget_count = len(self.root.winfo_children())
            for widget in self.root.winfo_children():
                widget.destroy()
            self.logger.debug(f"Cleared {widget_count} existing widgets")

            # Create main frame
            self.logger.debug("Creating main frame...")
            main_frame = tk.Frame(self.root, bg='#ffffff')
            main_frame.pack(fill='both', expand=True, padx=20, pady=20)

            # Create title
            self.logger.debug("Creating main title...")
            title_label = tk.Label(main_frame, text="TeleDrive - Main Interface",
                                  font=('Arial', 20, 'bold'), bg='#ffffff', fg='#0088cc')
            title_label.pack(pady=20)

            # Create status message
            self.logger.debug("Creating status message...")
            status_label = tk.Label(main_frame, text="Successfully logged in to Telegram!",
                                   font=('Arial', 12), bg='#ffffff', fg='#666666')
            status_label.pack(pady=10)

            # Create placeholder message
            self.logger.debug("Creating placeholder message...")
            placeholder_label = tk.Label(main_frame,
                                        text="Channel management and file operations will be added here.",
                                        font=('Arial', 11), bg='#ffffff', fg='#999999')
            placeholder_label.pack(pady=20)

            # Create logout button
            self.logger.debug("Creating logout button...")
            logout_btn = tk.Button(main_frame, text="Logout", font=('Arial', 12),
                                  bg='#dc3545', fg='white', padx=20, pady=10,
                                  command=self.logout)
            logout_btn.pack(pady=20)

            self.logger.info("✅ Main interface created successfully")

        except Exception as e:
            self.logger.error(f"❌ Failed to create main interface: {str(e)}", exc_info=True)
            messagebox.showerror("Interface Error", f"Failed to create main interface:\n{str(e)}")
            raise

    def logout(self):
        """Logout from Telegram with detailed logging"""
        self.logger.info("🚪 Logout button clicked")

        try:
            def async_logout():
                thread_logger = get_logger('TeleDrive.Logout')
                thread_logger.info("🔄 Starting logout process...")

                try:
                    # Create new event loop for this thread
                    thread_logger.debug("Creating new event loop...")
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)

                    # Logout from Telegram
                    thread_logger.info("📤 Logging out from Telegram...")
                    loop.run_until_complete(self.client.log_out())
                    thread_logger.info("✅ Successfully logged out from Telegram")

                    # Remove session file
                    session_file = f"{SESSION_NAME}.session"
                    if os.path.exists(session_file):
                        thread_logger.debug(f"Removing session file: {session_file}")
                        os.remove(session_file)
                        thread_logger.info("✅ Session file removed successfully")
                    else:
                        thread_logger.debug("No session file found to remove")

                    # Schedule UI update on main thread
                    thread_logger.debug("Scheduling login interface display...")
                    self.root.after(0, self.show_login_interface)

                except Exception as e:
                    thread_logger.error(f"❌ Logout failed: {str(e)}", exc_info=True)
                    self.root.after(0, lambda: messagebox.showerror("Error", f"Logout failed: {str(e)}"))
                finally:
                    thread_logger.debug("Closing event loop...")
                    loop.close()
                    thread_logger.info("🏁 Logout thread completed")

            thread = threading.Thread(target=async_logout, daemon=True)
            thread.start()
            self.logger.debug("Async logout thread started successfully")

        except Exception as e:
            self.logger.error(f"❌ Failed to initiate logout: {str(e)}", exc_info=True)
            messagebox.showerror("Error", f"Failed to logout: {str(e)}")

    def run(self):
        """Run the main application loop with logging"""
        self.logger.info("🎬 Starting main application loop...")

        try:
            self.root.mainloop()
            self.logger.info("🏁 Main application loop ended")

        except Exception as e:
            self.logger.error(f"❌ Main loop error: {str(e)}", exc_info=True)
            raise
        finally:
            self.logger.info("🔚 Application closed")

if __name__ == "__main__":
    try:
        logger.info("🚀 Starting TeleDrive application...")
        app = TeleDriveApp()
        app.run()
        logger.info("👋 TeleDrive application finished")

    except KeyboardInterrupt:
        logger.info("⚠️ Application interrupted by user")
    except Exception as e:
        logger.error(f"💥 Fatal error: {str(e)}", exc_info=True)
        print(f"Fatal error: {str(e)}")
    finally:
        logger.info("="*60)
        logger.info("TeleDrive Application Session Ended")
        logger.info("="*60)
