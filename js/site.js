$.get("https://verify.eryn.io/api/count", count => {
    $("#count").text(parseInt(count).toLocaleString());
});