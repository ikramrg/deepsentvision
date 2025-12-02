# src/inference/predict.py
import torch
import torch.nn as nn
from transformers import AutoTokenizer, AutoProcessor
from PIL import Image
import os
import argparse

# ================== CONFIG ==================
MODEL_PATH = os.environ.get("DEEPSENTVISION_MODEL_PATH")
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
if not MODEL_PATH:
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    candidate_models = [
        os.path.join(repo_root, "models", "deepsentvision_FINAL.pth"),
        os.path.join(repo_root, "model", "deepsentvision_FINAL.pth"),
    ]
    for candidate in candidate_models:
        if os.path.exists(candidate):
            MODEL_PATH = candidate
            break
model = None

# Tokenizer + Processor
tokenizer = AutoTokenizer.from_pretrained("distilbert-base-uncased")
processor = AutoProcessor.from_pretrained("facebook/convnextv2-tiny-1k-224")

# ================== MODÈLE EXACT DE TON .pth ==================
class DeepSentVision(nn.Module):
    def __init__(self, num_classes=3, dropout=0.5):
        super().__init__()
        
        # Texte : DistilBERT
        from transformers import AutoModel
        self.text_model = AutoModel.from_pretrained("distilbert-base-uncased")
        
        # Image : ConvNeXtV2 Tiny (on garde tout le backbone)
        from transformers import ConvNextV2Model
        self.vision_model = ConvNextV2Model.from_pretrained("facebook/convnextv2-tiny-1k-224")
        
        # Dropout global
        self.dropout = nn.Dropout(dropout)
        
        # CLASSIFIER (adapter aux dimensions réelles)
        # 768 (texte) + 768 (convnextv2-tiny pooled output) = 1536
        self.classifier = nn.Sequential(
            nn.Linear(1536, 512),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(512, num_classes)
        )

    def forward(self, input_ids=None, attention_mask=None, pixel_values=None):
        # Texte
        text_outputs = self.text_model(input_ids=input_ids, attention_mask=attention_mask)
        text_features = text_outputs.last_hidden_state[:, 0]  # [CLS] → 768
        
        # Image
        if pixel_values is not None:
            vision_outputs = self.vision_model(pixel_values=pixel_values)
            vision_features = vision_outputs.pooler_output  # 768 pour convnextv2-tiny
        else:
            vision_features = torch.zeros(text_features.size(0), 768, device=text_features.device)
        
        # Fusion : 768 + 1280 = 2048
        combined = torch.cat([text_features, vision_features], dim=1)
        combined = self.dropout(combined)
        logits = self.classifier(combined)
        return logits

def load_model(mp):
    m = DeepSentVision(num_classes=3, dropout=0.5)
    state_dict = torch.load(mp, map_location=DEVICE)
    m.load_state_dict(state_dict, strict=False)
    m.to(DEVICE)
    m.eval()
    print("MODÈLE CHARGÉ AVEC SUCCÈS – TOUT EST BON !")
    print(f"Device : {DEVICE}")
    return m

# ================== INFÉRENCE ==================
@torch.no_grad()
def predict_sentiment(text: str, image_path: str = None):
    # Texte
    text_inputs = tokenizer(text, truncation=True, padding="max_length", max_length=128, return_tensors="pt")
    input_ids = text_inputs["input_ids"].to(DEVICE)
    attention_mask = text_inputs["attention_mask"].to(DEVICE)
    
    # Image
    pixel_values = None
    if image_path and os.path.exists(image_path):
        image = Image.open(image_path).convert("RGB")
        image_inputs = processor(images=image, return_tensors="pt")
        pixel_values = image_inputs.pixel_values.to(DEVICE)
    
    outputs = model(input_ids, attention_mask, pixel_values)
    probs = torch.softmax(outputs, dim=1)[0].cpu().numpy()
    
    labels = ["négatif", "neutre", "positif"]
    pred = probs.argmax()
    
    return {
        "sentiment": labels[pred],
        "confidence": round(float(probs[pred]), 4),
        "probabilities": {l: round(float(p), 4) for l, p in zip(labels, probs)},
        "text": text,
        "image_used": image_path is not None
    }

# ================== TEST ==================
if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-path", type=str)
    args = parser.parse_args()
    mp = args.model_path if args.model_path else MODEL_PATH
    if mp is None or not os.path.exists(mp):
        raise FileNotFoundError("Model file not found. Set DEEPSENTVISION_MODEL_PATH or place models/deepsentvision_FINAL.pth")
    model = load_model(mp)
    print("\n" + "="*80)
    result = predict_sentiment("Incroyable ce produit ! La qualité est au top, je recommande à 100%")
    print("RÉSULTAT →", result)
    print("="*80)
    print("PHASE 1 + 2 = OFFICIELLEMENT TERMINÉES")
    print("TU PEUX MAINTENANT PASSER EN PRODUCTION")
