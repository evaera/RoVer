/* global window $ */

$.get('https://verify.eryn.io/api/count', count => {
  $('#count').text(parseInt(count).toLocaleString()).parent().css('visibility', 'visible').css('display', 'none').fadeIn()
})
