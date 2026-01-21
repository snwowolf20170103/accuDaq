import sys
import os
import io

# Set sys.stdout to use utf-8 to avoid encoding issues on Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Set up project root
project_root = r"f:\workspaces2025\accuDaq"
sys.path.insert(0, project_root)

from daq_core.compiler import DAQCompiler

def main():
    compiler = DAQCompiler()
    input_file = os.path.join(project_root, "test_realtime.daq")
    output_file = os.path.join(project_root, "run_realtime_app.py")
    
    print(f"Compiling {input_file} -> {output_file}...")
    success, result = compiler.compile_file(input_file, output_file)
    
    if success:
        print("Success: Compilation successful!")
    else:
        print(f"Error: Compilation failed: {result}")

if __name__ == "__main__":
    main()
