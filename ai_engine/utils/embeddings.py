from typing import List
import os
from sentence_transformers import SentenceTransformer, util
from sklearn.metrics.pairwise import cosine_similarity
from transformers import pipeline

class SimilarityProvider:
    def __init__(self):
        # We use a standard HF model. It's small (80MB) and very fast.
        self.model_name = "all-MiniLM-L6-v2"
        self._model = None

    @property
    def model(self):
        """Lazy load the model to avoid overhead if not used."""
        if self._model is None:
            print(f"[SimilarityProvider] Loading HF Model: {self.model_name}...")
            self._model = SentenceTransformer(self.model_name)
        return self._model

    def calculate_similarity(self, text1: str, text2: str) -> float:
        """
        Calculates cosine similarity between two texts.
        """
        try:
            embeddings = self.model.encode([text1, text2])
            # If sklearn is too heavy, we can do manual dot product since they are normalized
            # But let's assume util usage or manual
            score = util.cos_sim(embeddings[0], embeddings[1])
            return float(score[0][0])
        except Exception as e:
            print(f"[SimilarityProvider] Error: {e}")
            return 0.0

    def batch_similarity(self, source: str, candidates: List[str]) -> List[float]:
        try:
            source_emb = self.model.encode(source)
            candidate_embs = self.model.encode(candidates)
            scores = util.cos_sim(source_emb, candidate_embs)
            return [float(s) for s in scores[0]]
        except Exception as e:
            print(f"[SimilarityProvider] Error: {e}")
            return [0.0] * len(candidates)

class ToneAnalyzer:
    def __init__(self):
        self.model_name = "distilbert-base-uncased-finetuned-sst-2-english"
        self._classifier = None

    @property
    def classifier(self):
        if self._classifier is None:
            print(f"[ToneAnalyzer] Loading HF Model: {self.model_name}...")
            self._classifier = pipeline("sentiment-analysis", model=self.model_name)
        return self._classifier

    def analyze_tone(self, text: str) -> dict:
        """
        Analyzes the tone of the text.
        For SST-2: POSITIVE (Formal/Good) vs NEGATIVE (Casual/Bad) contextually for reviews.
        Note: This is a basic proxy for 'Quality'.
        """
        try:
            # Truncate to 512 tokens approx
            result = self.classifier(text[:2000])[0] 
            return {"label": result['label'], "score": float(result['score'])}
        except Exception as e:
            print(f"[ToneAnalyzer] Error: {e}")
            return {"label": "NEUTRAL", "score": 0.5}
