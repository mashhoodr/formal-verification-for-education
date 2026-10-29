import threading

# Global lock to serialize Z3 C++ engine calls across asynchronous HTTP worker threads
Z3_MUTEX = threading.Lock()
