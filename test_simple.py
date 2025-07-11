import tkinter as tk
from tkinter import messagebox

def test_button():
    messagebox.showinfo("Test", "Button clicked!")

# Create main window
root = tk.Tk()
root.title("Simple Test")
root.geometry("400x300")
root.configure(bg='white')

# Add some content
label = tk.Label(root, text="TeleDrive Test", font=('Arial', 20), bg='white')
label.pack(pady=50)

button = tk.Button(root, text="Test Button", font=('Arial', 12), 
                  bg='blue', fg='white', command=test_button)
button.pack(pady=20)

print("Starting simple test window...")
root.mainloop()
print("Window closed.")
