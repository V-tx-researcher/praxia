# Publicar no GitHub e ligar ao site do GPECSS no Wix

O site fica no GitHub Pages (gratuito). O "download do app" é a instalação pelo próprio
navegador: no site, o Chrome ou o Edge oferecem **Instalar app**, que cria o ícone no
computador e funciona sem internet. A análise por IA roda no computador da pessoa
(placa de vídeo com WebGPU; download único de 4,4 GB). No celular, o app funciona sem IA.

## Etapas (feitas por você, com a sua conta)

1. **Criar o repositório.** Em https://github.com/new: nome, por exemplo,
   `praxia`; **Public** (o Pages gratuito exige repositório público);
   não marque README, .gitignore nem licença.
2. **Enviar o projeto.** No terminal, dentro de `C:\Users\Usuario\Desktop\GPECSS-Consulta-CFESS-CRESS`:

   ```bash
   git remote add origin https://github.com/SEU-USUARIO/praxia.git
   ```

   ```bash
   git push -u origin master
   ```

   O próprio Git abre a janela para entrar na sua conta.
3. **Ligar o Pages.** No repositório: Settings > Pages > Build and deployment > Source:
   **GitHub Actions**. Depois, em Actions, abra "Publicar no GitHub Pages" e clique em
   **Run workflow** (as próximas publicações são automáticas a cada `git push`).
4. **Endereço do site:** `https://SEU-USUARIO.github.io/praxia/`
   (aparece em Settings > Pages ao fim da publicação).
5. **Coleta semanal.** O repositório traz também `.github/workflows/coleta.yml`, que roda
   às segundas e abre um pull request com novidades do portal do CFESS (nunca publica
   sozinho). Se não quiser, desative em Actions > "Coleta semanal" > Disable workflow.

## No Wix

Adicione um botão (ou item de menu) com o texto **"PraxIA — acessar e
instalar o app"** e o link do endereço do item 4, abrindo na mesma janela ou em nova aba.
Texto sugerido ao lado do botão:

> Consulta gratuita às normas do Conjunto CFESS-CRESS, com citação literal e link para o
> documento oficial. Para instalar no computador, abra a consulta no Chrome ou no Edge e
> clique em "Instalar app" na barra de endereço. A análise por IA (opcional) roda no seu
> computador; nenhuma pergunta é enviada a servidores.

Não use o elemento "Incorporar site" do Wix: a plataforma bloqueia ser aberta dentro de
outra página (segurança), e a IA e a instalação não funcionam dentro da moldura.

## Domínio próprio (opcional)

Para usar, por exemplo, `consulta.seudominio.com.br`: em Settings > Pages > Custom domain,
informe o subdomínio; no painel de DNS do domínio (no Wix, se o domínio for de lá), crie um
registro **CNAME** com nome `consulta` e valor `SEU-USUARIO.github.io`.
