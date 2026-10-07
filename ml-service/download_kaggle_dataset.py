import os
import subprocess

def download_dataset():
    print("This script uses the Kaggle API to download the 'ciplab/real-and-fake-face-detection' dataset.")
    print("Ensure you have placed your 'kaggle.json' API key in '~/.kaggle/kaggle.json' or '%USERPROFILE%\\.kaggle\\kaggle.json'.")
    
    os.makedirs('dataset', exist_ok=True)
    
    try:
        # Check if kaggle CLI is installed and configured
        subprocess.run(["kaggle", "--version"], check=True, capture_output=True)
    except FileNotFoundError:
        print("Kaggle CLI not found. Please install it using 'pip install kaggle'")
        return
    except subprocess.CalledProcessError:
        print("Kaggle API key not found or configured incorrectly. Please set it up.")
        return

    print("Downloading dataset...")
    subprocess.run(["kaggle", "datasets", "download", "-d", "ciplab/real-and-fake-face-detection", "-p", "dataset", "--unzip"], check=True)
    
    print("Dataset downloaded and unzipped.")
    print("Reorganizing folders to match 'dataset/real' and 'dataset/fake'...")
    
    base_dir = "dataset/real_and_fake_face"
    
    # Dataset extracts to real_and_fake_face/training_real and real_and_fake_face/training_fake
    real_src = os.path.join(base_dir, "training_real")
    fake_src = os.path.join(base_dir, "training_fake")
    
    if os.path.exists(real_src) and os.path.exists(fake_src):
        os.rename(real_src, "dataset/real")
        os.rename(fake_src, "dataset/fake")
        print("Successfully prepared 'dataset/real' and 'dataset/fake'.")
        print("You can now run 'python train.py'!")
    else:
        print(f"Could not find {real_src} or {fake_src}. Please reorganize manually.")

if __name__ == "__main__":
    download_dataset()
