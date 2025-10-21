# mapa_estacoes.py
"""
Script único para ler 'estacoes.json' (no mesmo diretório do script), montar grafo,
gerar mapa interativo com Folium e salvar 'mapa_estacoes.html'.

Instale dependências:
    pip install folium networkx

Execute:
    python mapa_estacoes.py
"""

import os
import json
import folium
import networkx as nx
from math import isfinite

# -------------------- CONFIG --------------------
# Nome do arquivo JSON (deixe em mesma pasta do script)
INPUT_FILENAME = "estacoes.json"

# Saída (será gravado na mesma pasta do script)
OUTPUT_HTML = "mapa_estacoes.html"

# Centro do mapa (caso não haja coordenadas reais)
MAP_CENTER = [-23.55, -46.63]   # São Paulo por padrão — altere se quiser
MAP_SPAN_DEGREES = 0.25         # quanto "espalhar" o layout gerado
SPRING_SEED = 42                # semente para layout reprodutível

# Destaque de rota (coloque nomes exatos das estações para destacar; None = sem destaque)
HIGHLIGHT_START = None          # ex: "Engenheiro Goulart"
HIGHLIGHT_END = None            # ex: "Aeroporto-Guarulhos"
# ------------------------------------------------

def debug_print(msg):
    print(msg)

def color_for_index(i):
    palette = [
        "blue", "red", "green", "purple", "orange", "darkblue", "cadetblue",
        "darkred", "darkgreen", "lightred", "beige", "darkpurple", "pink"
    ]
    return palette[i % len(palette)]

def get_base_paths():
    # pasta onde o script está salvo
    base_dir = os.path.dirname(os.path.abspath(__file__))
    input_path = os.path.join(base_dir, INPUT_FILENAME)
    output_path = os.path.join(base_dir, OUTPUT_HTML)
    return base_dir, input_path, output_path

def load_json(path):
    if not os.path.exists(path):
        raise FileNotFoundError(f"Arquivo não encontrado: {path}")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def build_graph_from_lines(lines):
    """
    lines: lista de objetos com campos como:
      { "id": 13, "nome": "Linha 13 – Jade", "trajeto": [...], "ligacoes": [...] }
    Retorna: grafo NetworkX e dicionário stations_meta
    stations_meta[name] = { "name": name, "linhas": set(), "lat": opt, "lon": opt }
    """
    G = nx.Graph()
    stations_meta = {}

    for linha in lines:
        lid = linha.get("id")
        trajeto = linha.get("trajeto", [])
        # adicionar nós e marcação de linhas
        for est in trajeto:
            if est not in stations_meta:
                stations_meta[est] = {"name": est, "linhas": set()}
            stations_meta[est]["linhas"].add(lid)
        # arestas entre consecutivos do trajeto
        for a, b in zip(trajeto, trajeto[1:]):
            if not G.has_edge(a, b):
                G.add_edge(a, b, linhas=set())
            G.edges[a, b]["linhas"].add(lid)
        # processar ligacoes (marca linhas que passam na estação)
        for lig in linha.get("ligacoes", []):
            est_name = lig.get("estacao")
            for other_line in lig.get("linhas", []):
                if est_name not in stations_meta:
                    stations_meta[est_name] = {"name": est_name, "linhas": set()}
                stations_meta[est_name]["linhas"].add(other_line)

    # garantir que todos os nós existam no grafo
    for name in stations_meta.keys():
        if not G.has_node(name):
            G.add_node(name)

    return G, stations_meta

def compute_positions(G, stations_meta, map_center, span_degrees, seed):
    # checa se existem coords reais nas metas (espera 'lat' e 'lon' se existirem)
    pos_latlon = {}
    have_coords = any(
        ("lat" in meta and "lon" in meta and isinstance(meta["lat"], (int, float))
         and isinstance(meta["lon"], (int, float)) and isfinite(meta["lat"]) and isfinite(meta["lon"]))
        for meta in stations_meta.values()
    )
    if have_coords:
        for name, meta in stations_meta.items():
            if "lat" in meta and "lon" in meta and isinstance(meta["lat"], (int, float)) and isinstance(meta["lon"], (int, float)):
                pos_latlon[name] = (meta["lat"], meta["lon"])

    # para demais nós (ou se não houver coords), gerar layout e projetar ao redor do centro
    nodes_without = [n for n in G.nodes() if n not in pos_latlon]
    if nodes_without:
        pos_2d = nx.spring_layout(G, seed=seed)
        xs = [c[0] for c in pos_2d.values()]
        ys = [c[1] for c in pos_2d.values()]
        minx, maxx = min(xs), max(xs)
        miny, maxy = min(ys), max(ys)
        range_x = maxx - minx if maxx != minx else 1.0
        range_y = maxy - miny if maxy != miny else 1.0
        lat_center, lon_center = map_center
        span = span_degrees
        for node, (x, y) in pos_2d.items():
            nx_norm = (x - minx) / range_x
            ny_norm = (y - miny) / range_y
            lat = lat_center + (ny_norm - 0.5) * span
            lon = lon_center + (nx_norm - 0.5) * span
            if node not in pos_latlon:
                pos_latlon[node] = (lat, lon)
    return pos_latlon

def draw_map(G, stations_meta, pos_latlon, lines_input, output_path, map_center):
    m = folium.Map(location=map_center, zoom_start=12)

    # agrupar segmentos por linha id
    line_to_segments = {}
    for u, v, data in G.edges(data=True):
        lids = data.get("linhas", set())
        if not lids:
            line_to_segments.setdefault(-1, []).append((u, v))
        else:
            for lid in lids:
                line_to_segments.setdefault(lid, []).append((u, v))

    # nome amigável id->nome
    id_to_name = {l.get("id"): l.get("nome", str(l.get("id"))) for l in lines_input}

    # desenhar FeatureGroup por linha (para LayerControl)
    for idx, (lid, segments) in enumerate(sorted(line_to_segments.items(), key=lambda x: str(x[0]))):
        color = color_for_index(idx)
        fg = folium.FeatureGroup(name=f"Linha {lid}: {id_to_name.get(lid, '')}")
        for (u, v) in segments:
            fg.add_child(folium.PolyLine(locations=[pos_latlon[u], pos_latlon[v]],
                                         weight=4, opacity=0.8, color=color,
                                         tooltip=f"Linha {lid}"))
        m.add_child(fg)

    # marcadores das estações
    for name, (lat, lon) in pos_latlon.items():
        linhas_here = sorted(list(stations_meta.get(name, {}).get("linhas", [])))
        popup_html = f"<b>{name}</b><br>Linhas: {', '.join(map(str, linhas_here))}"
        folium.CircleMarker(location=[lat, lon], radius=6, tooltip=name,
                            popup=popup_html, fill=True).add_to(m)

    folium.LayerControl(collapsed=False).add_to(m)
    m.save(output_path)
    debug_print(f"Mapa salvo em: {output_path}")
    return m

def highlight_shortest_path_and_save(G, pos_latlon, start, end, base_map, out_path_highlighted):
    if not start or not end:
        return False
    if start not in G or end not in G:
        debug_print("Start/end não encontrados no grafo. Verifique nomes exatos.")
        return False
    try:
        path = nx.shortest_path(G, source=start, target=end)
        coords = [pos_latlon[n] for n in path]
        folium.PolyLine(locations=coords, weight=7, color="red", opacity=0.95).add_to(base_map)
        for n in path:
            folium.CircleMarker(location=pos_latlon[n], radius=8, fill=True).add_to(base_map)
        base_map.save(out_path_highlighted)
        debug_print("Mapa com destaque salvo em: " + out_path_highlighted)
        debug_print("Caminho curto: " + " -> ".join(path))
        return True
    except nx.NetworkXNoPath:
        debug_print("Nenhum caminho entre " + start + " e " + end)
        return False

def main():
    # informar pasta atual e onde o script está
    debug_print("Working dir (process): " + os.getcwd())
    base_dir, input_path, output_path = get_base_paths()
    debug_print("Script base dir: " + base_dir)
    debug_print("Esperando JSON em: " + input_path)

    try:
        lines = load_json(input_path)
    except Exception as e:
        debug_print("Erro ao abrir/ler o JSON: " + str(e))
        return

    G, stations_meta = build_graph_from_lines(lines)
    pos_latlon = compute_positions(G, stations_meta, MAP_CENTER, MAP_SPAN_DEGREES, SPRING_SEED)

    # desenha e salva mapa principal
    m = draw_map(G, stations_meta, pos_latlon, lines, output_path, MAP_CENTER)

    # se configurado, destaca caminho e salva em arquivo separado
    if HIGHLIGHT_START and HIGHLIGHT_END:
        out_highlight = os.path.join(base_dir, "mapa_estacoes_destacado.html")
        highlight_shortest_path_and_save(G, pos_latlon, HIGHLIGHT_START, HIGHLIGHT_END, m, out_highlight)

if __name__ == "__main__":
    main()
