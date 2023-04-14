const cssClasses = {
    collectionSidebar: '.collection-sidebar',
    filterItem: '.collection-sidebar__filter-item',
    filter: '.collection-sidebar__filter-items',
};
// Tag filter
const url = window.location.origin + window.location.pathname;
const filterItem = $(cssClasses.filterItem);
let collectionUrl = $(cssClasses.collectionSidebar).data('collection-url');

var productsContainer = $('.collection-grid__products');

filterItem.each(function () {
    const tag = $(this).data('tag');
    if (url.indexOf(tag) !== -1) {
        $(this).addClass('active');
    }
});

filterItem.on('click', function () {
    let search = window.location.search;

    if (search.indexOf('page') !== -1) {
        const pageParam = search.split("&")[0];
        search = search.replace(pageParam, '').replace('&', '?');
    }

    const filter = $(this).parents('[data-filter]');
    const filterItems = filter.find(cssClasses.filterItem);
    $(this).toggleClass('active');
    var activeItems = $('.collection-sidebar').find(cssClasses.filterItem + '.active');
    var activeTags = [];
	
    activeItems.each(function (index, el) {
        var tag = $(el).attr('data-tag');
        if (tag) {
            activeTags.push(tag);
        }
    });

    var tagsUrl = activeTags.join('+');

    var newUrl = collectionUrl;

    if (tagsUrl) {
        newUrl += '/' + tagsUrl;
    }

    newUrl += search;

    $('.collection__main').addClass('ajax-loading');

    console.log(newUrl);
    console.log('---');

    $.get({
        url: newUrl,
        success: function (data) {
            var newProductsWrapper = $(data).find(".collection-grid__products");
            var newProductsHtml = newProductsWrapper.html();
            productsContainer.html(newProductsHtml);

            var newItemCount = newProductsWrapper.attr('data-products-count');
            $('.js-product-grid__count').text(newItemCount);
			$('#filter_form').prop('action', newUrl)
            //history.pushState({page: newUrl}, null, newUrl);
            $('.collection__main').removeClass('ajax-loading');
          	return SPR.registerCallbacks(),SPR.initRatingHandler(),SPR.initDomEls(),SPR.loadProducts(),SPR.loadBadges()
        }
    })
    return false;
});