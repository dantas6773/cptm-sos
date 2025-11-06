#!/usr/bin/env python3
# mapa_estacoes.py
# Gera a rota entre duas estações do estacoes.json original
# e exibe TODAS as estações do trajeto (no mapa e no console).

import os
import json
import argparse
import networkx as nx
import folium

# Defaults
INPUT_FILENAME = "estacoes.json"
OUTPUT_HTML = "mapa_rota.html"

# Layout geográfico sintético (não há lat/lon no JSON original)
MAP_CENTER = [-23.55, -46.63]  # centro (SP)
MAP_ZOOM = 13
SPAN_DEGREES = 0.18            # “largura” do layout


def load_lines(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def build_graph(lines):
    G = nx.Graph()
    for linha in lines:
        traj = linha.get("trajeto", []) or []
        for e in traj:
            G.add_node(e)
        for a, b in zip(traj, traj[1:]):
            if not G.has_edge(a, b):
                G.add_edge(a, b)
        # garantir nós citados em ligacoes existam (sem arestas extras)
        for lig in linha.get("ligacoes", []) or []:
            est = lig.get("estacao")
            if est:
                G.add_node(est)
    return G


def normalize(name, names):
    m = {n.lower(): n for n in names}
    return m.get(name.strip().lower())


def layout_for_path(path_nodes):
    # Layout apenas do subgrafo do caminho (limpo e minimalista)
    if len(path_nodes) > 1:
        H = nx.path_graph(path_nodes)
    else:
        H = nx.Graph()
        H.add_node(path_nodes[0])
    pos = nx.spring_layout(H, seed=42)
    xs = [p[0] for p in pos.values()]; ys = [p[1] for p in pos.values()]
    rx = (max(xs)-min(xs)) or 1.0; ry = (max(ys)-min(ys)) or 1.0
    lat0, lon0 = MAP_CENTER; span = SPAN_DEGREES
    pos_latlon = {}
    for n, (x, y) in pos.items():
        xn = (x - min(xs))/rx; yn = (y - min(ys))/ry  # 0..1
        lat = lat0 + (yn - 0.5)*span
        lon = lon0 + (xn - 0.5)*span
        pos_latlon[n] = (lat, lon)
    return pos_latlon


def main():
    parser = argparse.ArgumentParser(description='Gerar mapa de rota entre duas estações')
    parser.add_argument('--start', '-s', required=True, help='Nome da estação de origem')
    parser.add_argument('--end', '-e', required=True, help='Nome da estação de destino')
    parser.add_argument('--input', '-i', default=INPUT_FILENAME, help='Arquivo de entrada (estacoes.json)')
    parser.add_argument('--output', '-o', default=OUTPUT_HTML, help='Arquivo HTML de saída')
    args = parser.parse_args()

    START_STATION = args.start
    END_STATION = args.end

    base = os.path.dirname(os.path.abspath(__file__))
    json_path = os.path.join(base, args.input)
    lines = load_lines(json_path)
    G = build_graph(lines)

    # resolver nomes (case-insensitive exato)
    all_names = list(G.nodes)
    start = normalize(START_STATION, all_names)
    end = normalize(END_STATION, all_names)
    if not start or not end:
        print("Estação inválida. START:", START_STATION, "->", start, "| END:", END_STATION, "->", end)
        return 2
    if start not in G or end not in G:
        print("Estação não presente no grafo:", start, end)
        return 3

    # menor caminho por número de segmentos
    try:
        path = nx.shortest_path(G, source=start, target=end)
    except nx.NetworkXNoPath:
        print(f"Nenhuma rota entre '{start}' e '{end}'.")
        return 4

    # ---- Mostrar TODAS as estações do trajeto ----
    print("Rota (", len(path), "estações ):")
    for i, n in enumerate(path, start=1):
        print(f"{i:02d}. {n}")

    # layout só da rota e mapa minimalista
    pos = layout_for_path(path)
    m = folium.Map(location=MAP_CENTER, zoom_start=MAP_ZOOM)

    # polilinha da rota (apenas ela), com popup listando todas as estações
    lista_html = "<b>Rota</b><br>" + "<br>".join(f"{i:02d}. {n}" for i, n in enumerate(path, start=1))
    folium.PolyLine([pos[n] for n in path], color="red", weight=7, opacity=0.95,
                    popup=folium.Popup(lista_html, max_width=320)).add_to(m)

    # marcadores numerados ao longo da rota
    for i, n in enumerate(path, start=1):
        lat, lon = pos[n]
        label = f"{i:02d}. {n}"
        # início e fim com pin; intermediários com círculo
        if i == 1:
            folium.Marker([lat, lon], tooltip=label, popup=f"Início<br>{label}").add_to(m)
        elif i == len(path):
            folium.Marker([lat, lon], tooltip=label, popup=f"Destino<br>{label}").add_to(m)
        else:
            folium.CircleMarker([lat, lon], radius=6, tooltip=label, popup=label, fill=True).add_to(m)

    out = os.path.join(base, args.output)
    m.save(out)
    print("Mapa de rota salvo em:", out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
