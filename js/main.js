document.addEventListener('DOMContentLoaded', function() {
    [].forEach.call(document.querySelectorAll('h2, h3, h4, h5, h6'), function(el) {
        var anchor = document.createElement('a');
        anchor.className = "header-link";
        anchor.href      = '#' + el.id;
        anchor.innerHTML = '¶';
        el.appendChild(anchor);
    });
});
