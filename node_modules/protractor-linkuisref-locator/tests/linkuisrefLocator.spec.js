'use strict';

describe('protractor-linkuisref-locator', function () {
  var _beforeAll = false;
  beforeEach(function () {
    if (_beforeAll) return;
    else {
      browser.get('http://localhost:3000');

      _beforeAll = true;
    }
  });

  it('by.linkUiSref locator is defined', function () {
    expect(by.linkUiSref).toBeDefined();
  });

  describe('by.linkUiSref', function () {
    it('finds an anchor element by ui-sref with no parent element', function () {
      expect(element(by.linkUiSref('users.index')).isPresent()).toEqual(true);
    });

    it('finds an anchor element by ui-sref with parent element', function () {
      expect(element(by.linkUiSref('users.show({userId: 1})', element(by.css('#parent')))).isPresent()).toEqual(true);
    });

    it('returns all anchor elements found by ui-sref', function () {
      expect(element(by.linkUiSref('users.show({userId: 1})')).isPresent()).toEqual(true);
    });
	
	describe('with data-ui-sref', function() {
		it('finds an anchor element by data-ui-sref with no parent element', function () {
		  expect(element(by.linkUiSref('widgets.index')).isPresent()).toEqual(true);
		});

		it('finds an anchor element by data-ui-sref with parent element', function () {
		  expect(element(by.linkUiSref('widgets.show({widgetId: 1})', element(by.css('#widgets-parent')))).isPresent()).toEqual(true);
		});

		it('returns all anchor elements found by data-ui-sref', function () {
		  expect(element(by.linkUiSref('widgets.show({widgetId: 1})')).isPresent()).toEqual(true);
		});
	});
  });
});