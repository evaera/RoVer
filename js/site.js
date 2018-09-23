/* global window $ */

$.get('https://verify.eryn.io/api/count', count => {
  $('#count').text(parseInt(count).toLocaleString())
})

window.adjustHeight = function (iframe) {
  iframe.height = ''
  iframe.height = iframe.contentWindow.document.body.scrollHeight + 'px'

  if (window.location.hash) {
    var id = window.location.hash.substring(1)

    var el = iframe.contentWindow.document.getElementById(id)

    if (el) {
      window.requestAnimationFrame(function () {
        window.scrollTo(0, iframe.getBoundingClientRect().y + el.getBoundingClientRect().y)
      })
    }
  }
}
