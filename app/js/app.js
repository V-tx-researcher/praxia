"use strict";

let documentos = [];

async function carregarDocumentos() {
    try {
        const resposta = await fetch("../dados/indices/documentos.json");

        if (!resposta.ok) {
            throw new Error("Acervo indisponível");
        }

        documentos = await resposta.json();
    } catch (erro) {
        documentos = [];
        console.warn("Não foi possível carregar o acervo:", erro);
    }
}

function buscarDocumentos(pergunta) {
    const palavras = pergunta.toLowerCase()
        .split(/\W+/)
        .filter(p => p.length > 3);

    return documentos
        .filter(doc => doc.aprovado === true)
        .map(doc => {
            const texto = (
                doc.titulo + " " +
                doc.trecho + " " +
                (doc.assuntos || []).join(" ")
            ).toLowerCase();

            const pontuacao = palavras.filter(p => texto.includes(p)).length;

            return { ...doc, pontuacao };
        })
        .filter(doc => doc.pontuacao > 0)
        .sort((a, b) => b.pontuacao - a.pontuacao)
        .slice(0, 10);
}

function criarElemento(tag, texto) {
    const elemento = document.createElement(tag);
    elemento.textContent = texto;
    return elemento;
}

function mostrarResultados(resultados) {
    const container = document.getElementById("fontes");
    container.replaceChildren();

    for (const documento of resultados) {
        const artigo = document.createElement("article");
        artigo.className = "fonte";

        artigo.appendChild(criarElemento("h3", documento.titulo));
        artigo.appendChild(
            criarElemento("p", "Situação normativa: " +
                (documento.vigencia || "Não verificada"))
        );

        const citacao = criarElemento("blockquote", documento.trecho);
        artigo.appendChild(citacao);

        const link = document.createElement("a");
        link.href = documento.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "Consultar documento original";

        artigo.appendChild(link);
        container.appendChild(artigo);
    }
}

document.getElementById("consultar").addEventListener("click", () => {
    const pergunta = document.getElementById("pergunta").value.trim();
    const resultado = document.getElementById("resultado");

    if (!pergunta) {
        resultado.textContent = "Digite uma pergunta antes de consultar.";
        return;
    }

    const fontes = buscarDocumentos(pergunta);
    mostrarResultados(fontes);

    if (!fontes.length) {
        resultado.textContent =
            "Não foram encontradas fontes aprovadas suficientes " +
            "para fundamentar uma resposta. Consulte o CRESS competente.";
        return;
    }

    resultado.textContent =
        "Foram encontradas " + fontes.length +
        " fontes relacionadas. Examine os trechos e consulte " +
        "integralmente os documentos originais. " +
        "A análise por LLM ainda não está habilitada nesta versão.";
});

carregarDocumentos();