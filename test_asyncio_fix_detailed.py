#!/usr/bin/env python3
"""
Test script để kiểm tra asyncio fix với logging chi tiết
"""

import asyncio
import sys
import threading
import time
from datetime import datetime

def log_detailed(step, message, level="INFO"):
    """Detailed logging function"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_msg = f"[{timestamp}] {step}: {message}"
    
    if level == "ERROR":
        print(f"❌ {log_msg}")
    elif level == "WARNING":
        print(f"⚠️ {log_msg}")
    else:
        print(f"ℹ️ {log_msg}")

# Global event loop
main_loop = None

def start_event_loop():
    """Start the main asyncio event loop"""
    global main_loop
    log_detailed("EVENT_LOOP", "Starting main event loop...")
    
    try:
        # Set Windows event loop policy if on Windows
        if sys.platform == "win32":
            asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
            log_detailed("EVENT_LOOP", "Set Windows ProactorEventLoopPolicy")
        
        # Create and set the event loop
        main_loop = asyncio.new_event_loop()
        asyncio.set_event_loop(main_loop)
        
        log_detailed("EVENT_LOOP", "Event loop created and set")
        
        # Run the event loop forever
        main_loop.run_forever()
        
    except Exception as e:
        log_detailed("EVENT_LOOP", f"Event loop error: {e}", "ERROR")
    finally:
        log_detailed("EVENT_LOOP", "Event loop stopped")

def run_async_safe(coro):
    """Safely run coroutine in the main event loop from another thread"""
    try:
        log_detailed("ASYNC_CALL", f"Running coroutine: {coro.__name__ if hasattr(coro, '__name__') else str(coro)}")
        
        if main_loop is None:
            log_detailed("ASYNC_ERROR", "Main event loop not available", "ERROR")
            return {"success": False, "error": "Event loop not available"}
        
        if main_loop.is_closed():
            log_detailed("ASYNC_ERROR", "Main event loop is closed", "ERROR")
            return {"success": False, "error": "Event loop is closed"}
        
        # Use run_coroutine_threadsafe to run coroutine in main loop
        future = asyncio.run_coroutine_threadsafe(coro, main_loop)
        result = future.result(timeout=10)  # 10 second timeout
        
        log_detailed("ASYNC_SUCCESS", f"Coroutine completed successfully")
        return result
        
    except asyncio.TimeoutError:
        log_detailed("ASYNC_ERROR", "Coroutine timed out after 10 seconds", "ERROR")
        return {"success": False, "error": "Operation timed out"}
    except Exception as e:
        log_detailed("ASYNC_ERROR", f"Coroutine failed: {str(e)}", "ERROR")
        return {"success": False, "error": str(e)}

async def test_async_function():
    """Test async function"""
    log_detailed("TEST_ASYNC", "Starting async function...")
    await asyncio.sleep(1)
    log_detailed("TEST_ASYNC", "Async function completed")
    return {"success": True, "message": "Async function worked!"}

def test_from_thread():
    """Test calling async function from thread"""
    log_detailed("THREAD_TEST", "Testing async call from thread...")
    result = run_async_safe(test_async_function())
    log_detailed("THREAD_TEST", f"Result: {result}")
    return result

def main():
    """Main test function"""
    print("🧪 Testing Asyncio Fix with Detailed Logging")
    print("=" * 60)
    
    # Start the event loop in a separate thread
    log_detailed("STARTUP", "Starting event loop thread...")
    loop_thread = threading.Thread(target=start_event_loop, daemon=True)
    loop_thread.start()
    
    # Wait for the event loop to start
    time.sleep(1)
    
    # Test 1: Simple async call
    log_detailed("TEST_1", "Testing simple async call...")
    result1 = test_from_thread()
    print(f"Test 1 Result: {result1}")
    
    # Test 2: Multiple async calls
    log_detailed("TEST_2", "Testing multiple async calls...")
    for i in range(3):
        log_detailed("TEST_2", f"Call {i+1}/3")
        result = test_from_thread()
        print(f"Call {i+1} Result: {result}")
        time.sleep(0.5)
    
    log_detailed("COMPLETE", "All tests completed successfully!")
    
    # Stop the event loop
    if main_loop and not main_loop.is_closed():
        log_detailed("SHUTDOWN", "Stopping event loop...")
        main_loop.call_soon_threadsafe(main_loop.stop)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        log_detailed("SHUTDOWN", "Test interrupted by user")
    except Exception as e:
        log_detailed("ERROR", f"Test failed: {e}", "ERROR")
