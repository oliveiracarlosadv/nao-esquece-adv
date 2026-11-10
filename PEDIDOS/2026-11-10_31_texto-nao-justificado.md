# Pedido 31 — Texto do PDF não estava justificado

**Data:** 10/11/2026

## Texto integral

> Texto não está justificado.

(Enviado com captura do inteiro teor no PDF, com a margem direita irregular.)

## Causa e correção

- A opção de justificar da biblioteca de PDF não estica uma linha quando ela é enviada sozinha (trata como última linha do parágrafo). O app enviava linha por linha para controlar a quebra de página, então nada era justificado.
- Agora a justificação é feita pelo próprio app: o espaço que sobra em cada linha é distribuído entre as palavras, alinhando as margens esquerda e direita. A última linha de cada parágrafo fica à esquerda. Espaços repetidos do texto original são normalizados.
