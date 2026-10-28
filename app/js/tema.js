// Aplica o tema (escuro por padrão, claro opcional) antes da página aparecer, para
// não piscar. Script clássico e síncrono no <head>: a CSP não permite script inline.
// A preferência fica só neste navegador.
(function () {
  var tema = "escuro";
  try {
    if (localStorage.getItem("gpecss-tema") === "claro") tema = "claro";
  } catch (e) {
    // armazenamento indisponível (modo privado): usa o padrão
  }
  if (tema === "claro") document.documentElement.setAttribute("data-tema", "claro");
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", tema === "claro" ? "#173456" : "#0a0e14");
})();
