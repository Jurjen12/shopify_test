/*==============================================================================*/
if ((typeof ShopifyAPI) === 'undefined') { ShopifyAPI = {}; }
/*============================================================================
  Theme Money
==============================================================================*/
window.theme = window.theme || {};
theme.Currency = (function() {
  var moneyFormat = '$'; // eslint-disable-line camelcase

  function formatMoney(cents, format) {
    if (typeof cents === 'string') {
      cents = cents.replace('.', '');
    }
    var value = '';
    var placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
    var formatString = format || moneyFormat;

    function formatWithDelimiters(number, precision, thousands, decimal) {
      thousands = thousands || ',';
      decimal = decimal || '.';

      if (isNaN(number) || number === null) {
        return 0;
      }

      number = (number / 100.0).toFixed(precision);

      var parts = number.split('.');
      var dollarsAmount = parts[0].replace(
        /(\d)(?=(\d\d\d)+(?!\d))/g,
        '$1' + thousands
      );
      var centsAmount = parts[1] ? decimal + parts[1] : '';

      return dollarsAmount + centsAmount;
    }

    switch (formatString.match(placeholderRegex)[1]) {
      case 'amount':
        value = formatWithDelimiters(cents, 2);
        break;
      case 'amount_no_decimals':
        value = formatWithDelimiters(cents, 0);
        break;
      case 'amount_with_comma_separator':
        value = formatWithDelimiters(cents, 2, '.', ',');
        break;
      case 'amount_no_decimals_with_comma_separator':
        value = formatWithDelimiters(cents, 0, '.', ',');
        break;
      case 'amount_no_decimals_with_space_separator':
        value = formatWithDelimiters(cents, 0, ' ');
        break;
    }

    return formatString.replace(placeholderRegex, value);
  }

  return {
    formatMoney: formatMoney
  };
})();

/*============================================================================
  API Helper Functions
==============================================================================*/
ShopifyAPI.onCartUpdate = function(cart) {
  console.log('There are now ' + cart.item_count + ' items in the cart.');
};

ShopifyAPI.updateCartNote = function(note, callback) {
  var params = {
    type: 'POST',
    url: '/cart/update.js',
    data: 'note=' + attributeToString(note),
    dataType: 'json',
    success: function(cart) {
      if ((typeof callback) === 'function') {
        callback(cart);
      }
      else {
        ShopifyAPI.onCartUpdate(cart);
      }
    },
    error: function(XMLHttpRequest, textStatus) {
      ShopifyAPI.onError(XMLHttpRequest, textStatus);
    }
  };
  jQuery.ajax(params);
};

ShopifyAPI.onError = function(XMLHttpRequest, textStatus) {
  var data = eval('(' + XMLHttpRequest.responseText + ')');
  if (!!data.message) {
    alert(data.message + '(' + data.status  + '): ' + data.description);
  }
};
/*============================================================================
  POST to cart/add.js returns the JSON of the cart
    - Allow use of form element instead of just id
    - Allow custom error callback
==============================================================================*/
ShopifyAPI.addItemFromForm = function(form, callback, errorCallback) {
  var params = {
    type: 'POST',
    url: '/cart/add.js',
    data: jQuery(form).serialize(),
    dataType: 'json',
    success: function(line_item) {
      if ((typeof callback) === 'function') {
        callback(line_item, form);
      }
      else {
        ShopifyAPI.onItemAdded(line_item, form);
      }
    },
    error: function(XMLHttpRequest, textStatus) {
      if ((typeof errorCallback) === 'function') {
        errorCallback(XMLHttpRequest, textStatus);
      }
      else {
        ShopifyAPI.onError(XMLHttpRequest, textStatus);
      }
    }
  };
  jQuery.ajax(params);
};

// Get from cart.js returns the cart in JSON
ShopifyAPI.getCart = function(callback) {
  jQuery.getJSON('/cart.js', function (cart, textStatus) {
    if ((typeof callback) === 'function') {
      callback(cart);
    }
    else {
      ShopifyAPI.onCartUpdate(cart);
    }
  });
};

// POST to cart/change.js returns the cart in JSON
ShopifyAPI.changeItem = function(line, quantity, callback) {
  var params = {
    type: 'POST',
    url: '/cart/change.js',
    data: 'quantity=' + quantity + '&line=' + line,
    dataType: 'json',
    success: function(cart) {
      if ((typeof callback) === 'function') {
        callback(cart);
      }
      else {
        ShopifyAPI.onCartUpdate(cart);
      }
    },
    error: function(XMLHttpRequest, textStatus) {
      ShopifyAPI.onError(XMLHttpRequest, textStatus);
    }
  };
  jQuery.ajax(params);
};

/*============================================================================
  JS Cart Update
==============================================================================*/
var guiCartLastUpdate = new Date().getTime();
var guiCartIsUpdating = false;
var guiHandlersIsUpdating = false;
function guiCartUpdate(guiEm, guiCartClickTime){
  if(!guiCartIsUpdating && (guiCartClickTime == guiCartLastUpdate || guiCartClickTime === undefined)){
    guiCartIsUpdating = true;
    var line = guiEm.closest('.cart-row').data('line');
    var quantity = guiEm.val();
    var params = {
      type: 'POST',
      url: '/cart/change.js',
      data: 'quantity=' + quantity + '&line=' + line,
      dataType: 'json',
      success: function(cart) {
        ShopifyAPI.onCartUpdate(cart);
        var items = [],item = {},data = {};
        $('#cart-form table.table tr.cart-row').each(function(index,element){
          var $this = $(this);
          var thisLine = $(this).data('item-vid');
          $.each(cart.items, function(index, cartItem) {
            if(thisLine == (cartItem.variant_id)){
              console.log(thisLine+'-'+cartItem.variant_id);
           	  $this.find('.cart__final-price [data-cart-item-regular-price]').html(theme.Currency.formatMoney(cartItem.final_line_price, '€{{amount}}').replace('.', ','));
             }
          });
        });
        $('#header #CartCount [data-cart-count]').html(cart.item_count);
        $('.cart_review .cart-subtotal .cart-subtotal__price').html(theme.Currency.formatMoney(cart.total_price, '€{{amount}}').replace('.', ','));
        guiCartIsUpdating = false;
        guiHandlersIsUpdating = false;
      },
      error: function(XMLHttpRequest, textStatus) {
      ShopifyAPI.onError(XMLHttpRequest, textStatus);
      }
    };
    jQuery.ajax(params);
  }
}
$('.quantity .change a').click(function() {
  if(!guiHandlersIsUpdating){
    guiHandlersIsUpdating = true;
    var way = $(this).data('way');
    var input = $(this).closest('.quantity').find('input');
    var qty = parseInt(input.val());
    if (way == 'up') {
      qty++;
    } else {
      if (qty > 0) {qty--;}
    }
    input.val(qty);
    guiCartUpdate(input);
  }
});
$(document).ready(function(){ 
  $('#cart-form input').on('change', function(){
    var selectVal = $(this).val();
    function isNumeric(n) {
      return !isNaN(parseFloat(n)) && isFinite(n);
    }
    var val = $(this).val();
    if(isNumeric(val)) { 
      guiCartUpdate($(this));
    } 
  });
  $('#cart-form .gui-handle a').click(function(){
     var guiCartClickTime = new Date().getTime();
     guiCartLastUpdate = guiCartClickTime;
     setTimeout(function(){
     	guiCartUpdate($('#cart-form'), guiCartClickTime);
     }, 1000);
  });
});
