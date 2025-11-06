from flask import Flask, request, jsonify
import subprocess

app = Flask(__name__)

@app.route('/gerar_mapa', methods=['POST'])
def gerar_mapa():
    data = request.get_json()
    origem = data.get('origem')
    destino = data.get('destino')

    if not origem or not destino:
        return jsonify({'erro': 'Origem ou destino não enviados'}), 400

    try:
        # chama o mapa_rota.py com os parâmetros recebidos
        subprocess.run(['python', 'mapa_rota.py', origem, destino], check=True)
        return jsonify({'mensagem': f'Mapa de {origem} até {destino} gerado com sucesso!'})
    except Exception as e:
        return jsonify({'erro': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
