import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, models, transforms
from torch.utils.data import DataLoader, random_split
import os
import copy

def check_dataset_ready():
    if not os.path.exists('dataset/real') or not os.path.exists('dataset/fake'):
        print("Dataset folders 'dataset/real' and 'dataset/fake' not found.")
        print("Please run 'python download_kaggle_dataset.py' to fetch the dataset first.")
        return False
    if len(os.listdir('dataset/real')) == 0 or len(os.listdir('dataset/fake')) == 0:
        print("Dataset folders exist but are empty.")
        print("Please run 'python download_kaggle_dataset.py' to fetch the dataset first.")
        return False
    return True

def train_model():
    if not check_dataset_ready():
        return

    dataset_path = 'dataset'

    # Data Augmentation and Normalization
    data_transforms = {
        'train': transforms.Compose([
            transforms.Resize(256),
            transforms.RandomResizedCrop(224),
            transforms.RandomHorizontalFlip(),
            transforms.ColorJitter(brightness=0.2, contrast=0.2),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ]),
        'val': transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ]),
    }

    # Load full dataset
    full_dataset = datasets.ImageFolder(dataset_path, transform=data_transforms['train'])
    
    # Split into train/val (80/20)
    train_size = int(0.8 * len(full_dataset))
    val_size = len(full_dataset) - train_size
    train_dataset, val_dataset = random_split(full_dataset, [train_size, val_size])
    
    # Overwrite val_dataset transform
    val_dataset.dataset.transform = data_transforms['val']

    # num_workers=0 is safer on Windows
    dataloaders = {
        'train': DataLoader(train_dataset, batch_size=32, shuffle=True, num_workers=0),
        'val': DataLoader(val_dataset, batch_size=32, shuffle=False, num_workers=0)
    }
    
    dataset_sizes = {'train': len(train_dataset), 'val': len(val_dataset)}
    print(f"Training on {dataset_sizes['train']} images, validating on {dataset_sizes['val']} images.")

    device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")

    model = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.IMAGENET1K_V1)
    num_ftrs = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(num_ftrs, 2)
    model = model.to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.AdamW(model.parameters(), lr=0.001, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=7, gamma=0.1)

    num_epochs = 15
    best_model_wts = copy.deepcopy(model.state_dict())
    best_acc = 0.0

    print("Starting training loop...")
    for epoch in range(num_epochs):
        print(f'Epoch {epoch+1}/{num_epochs}')
        print('-' * 10)

        for phase in ['train', 'val']:
            if phase == 'train':
                model.train()
            else:
                model.eval()

            running_loss = 0.0
            running_corrects = 0

            for inputs, labels in dataloaders[phase]:
                inputs = inputs.to(device)
                labels = labels.to(device)

                optimizer.zero_grad()

                with torch.set_grad_enabled(phase == 'train'):
                    outputs = model(inputs)
                    _, preds = torch.max(outputs, 1)
                    loss = criterion(outputs, labels)

                    if phase == 'train':
                        loss.backward()
                        optimizer.step()

                running_loss += loss.item() * inputs.size(0)
                running_corrects += torch.sum(preds == labels.data)

            if phase == 'train':
                scheduler.step()

            epoch_loss = running_loss / dataset_sizes[phase]
            epoch_acc = running_corrects.double() / dataset_sizes[phase]

            print(f'{phase} Loss: {epoch_loss:.4f} Acc: {epoch_acc:.4f}')

            if phase == 'val' and epoch_acc > best_acc:
                best_acc = epoch_acc
                best_model_wts = copy.deepcopy(model.state_dict())

        print()

    print(f'Training complete. Best val Acc: {best_acc:4f}')
    
    model.load_state_dict(best_model_wts)
    os.makedirs("models", exist_ok=True)
    torch.save(model.state_dict(), "models/efficientnet_deepfake.pth")
    print("Saved best model weights to models/efficientnet_deepfake.pth")

if __name__ == "__main__":
    train_model()
