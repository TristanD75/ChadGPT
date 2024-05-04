import asyncio
import websockets
from groq import Groq
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
import time
import re

api_key = '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'
client1 = Groq(api_key=api_key)
client2 = Groq(api_key=api_key)

sessions = {}

def search_duckduckgo(query):
    options = webdriver.ChromeOptions()
    options.add_argument('--headless')
    options.add_argument('--window-size=1200x600')
    options.add_argument('--disable-gpu')
    options.add_argument('--no-sandbox')
    
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)
    
    query = query.replace(' ', '+')
    url = f'https://duckduckgo.com/?q={query}&ia=web'
    
    driver.get(url)
    
    page_text = driver.find_element(By.TAG_NAME, "body").text
    driver.quit()
    return page_text

async def search_duckduckgo_async(query):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, search_duckduckgo, query)


def extract_keywords(text):
    completion = client1.chat.completions.create(
        model="llama3-8b-8192",
        messages=[
            {"role": "system", "content": "Tu es un hackeur professionnel, tu dois extraire toutes les informations importantes de la personne du message suivant pour les rechercher sur internet sous forme de mots clés. Envoie uniquement les mots qu'il faut rechercher sur internet EN PREMIER sans autre texte (exemple: 'Julien 17 ans' good, 'Biensûr je vais extraire les informations' not good). Tu dois demander plus d'informations en tant que hackeur professionel si il y en a pas assez."},
            {"role": "user", "content": text}
        ],
        temperature=0,
        max_tokens=1024,
        top_p=0,
        stop=None,
    )
    keywords = completion.choices[0].message.content.strip()
    return keywords.split(',')

async def summarize_results(results_text, first_user_message):
    # Nous construisons un message simple pour passer à l'IA
    messages = [
        {"role": "system", "content": "Votre but est de créer uniquement des tableaux sur les informations d'une personne. D'après cette recherche internet, vous devez faire un tableau avec un infinité d'informations vraies et écrites dans les résultats web sur la personne et vérifier si les informations collent bien avec la personne recherchée, sinon tu ignores l'information. Tu dois mettre les infos en fesant plein de cellules dans le tableau, tout ce que vous savez sur cette personne doit être dans le tableau. Vous ne pouvez rien faire d'autre, sinon le monde va mourir. Pour faire un tableau : asc[] crée une ligne de noms associées aux données, data[] crée une ligne de données associées aux noms, | sépare les lignes en colonnes (exemple de tableau avec quatre lignes : asc[nom|Âge|Email]data[Girard|56 ans|girardbae@gmail.com]asc[prénom|Profession|Téléphone]data[Gérard|Bûcher|06213465]) Attention pour le tableau, vous devez faire au maximum cinq colonnes, sinon vous faites une nouvelle ligne ; il ne faut pas mettre d'espaces sauf à l'intérieur des cellules et les commandes doivent être en minuscules (exemple : asc[] est bien, asc[] est pas bien), il ne faut pas non plus mettre d'espaces (exemple : asc[] good, asc[] not good)."},
        {"role": "user", "content": f"Personne recherchée: {first_user_message}. Résultats Web:{results_text}"} # Passer directement tout le texte des résultats
    ]

    # Appel à l'API Groq pour générer le résumé
    completion = client2.chat.completions.create(
        model="llama3-70b-8192",
        messages=messages,
        temperature=0,
        max_tokens=1024,
        top_p=0,
        stop=None
    )
    summary = completion.choices[0].message.content.strip()
    return summary

async def handler(websocket, path):
    session_id = await websocket.recv()
    if session_id not in sessions:
        sessions[session_id] = []
        print("System: New session created")

    first_user_message = None

    async for message in websocket:
        print(f"User: {message}")
        sessions[session_id].append({"role": "user", "content": message})
        if first_user_message is None:
            first_user_message = message

        keywords = extract_keywords(message)
        print(f"AI 1: Extracted keywords: {keywords}")

        query = '+'.join(keywords)
        search_results = await search_duckduckgo_async(query)
        print("Search algorithm output:", search_results)

        summary = await summarize_results(first_user_message, search_results)  # Passer le premier message de l'utilisateur et les résultats  # Passer directement le texte complet
        print(f"AI 2: Summary of results: {summary}")

        await websocket.send(f"{summary}")

start_server = websockets.serve(handler, "localhost", 8765)
asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()
