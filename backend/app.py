from flask import Flask, request, jsonify
from flask_cors import CORS
import whisper
import os

app = Flask(__name__)
CORS(app)

model = whisper.load_model("base")  # Podés usar "tiny", "small", etc.

@app.route("/transcribe", methods=["POST"])
def transcribe():
    if "file" not in request.files:
        return jsonify({"error": "No se envió ningún archivo"}), 400

    audio = request.files["file"]
    filename = "temp_audio." + audio.filename.split(".")[-1]
    audio.save(filename)

    try:
        result = model.transcribe(filename)
        os.remove(filename)
        return jsonify({"text": result["text"]})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(port=5000)
