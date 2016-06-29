(function ($) {
	tinymce.create('tinymce.plugins.unyson_shortcodes', {
		init: initPlugin
	});

	tinymce.PluginManager.add('unyson_shortcodes', tinymce.plugins['unyson_shortcodes']);

	////////////

	function initPlugin (editor) {
		console.log("init", editor);

		editor.addButton('unyson_shortcodes', {
			type: 'panelbutton',
			icon: 'fw-shortcodes-button',
			panel: {
				style: 'max-width: 450px;',
				role: 'application',
				classes: 'fw-shortcodes-container',
				autohide: true,
				html: shortcodesHtmlFor(editor),
				onlick: function (e) {
					console.log("click", e);
				}
			},
			tooltip: fw_ext_editor_shortcodes_v2_data.button_title
		});
	}

	function shortcodesHtmlFor (editor) {
		var shortcodes = shortcodesListFor(editor);

		return _.map(
			shortcodes,
			_.compose(
				singleShortcodeHtml,
				dataFor
			)
		).join("\n");

		function dataFor (shortcode) {
			return _.findWhere(
				fw_ext_editor_shortcodes_v2_data.shortcodes,
				{tag: shortcode}
			);
		}

		function singleShortcodeHtml (shortcode) {
			var iconHtml = null;

			if (shortcode.icon) {
				if (window.FwBuilderComponents) {
					if (typeof FwBuilderComponents.ItemView.iconToHtml !== "undefined") {
						iconHtml = FwBuilderComponents.ItemView.iconToHtml(shortcode.icon);
					}
				}

				if (! iconHtml) {
					iconHtml = '<img src="' + shortcode.icon + '"/>';
				}
			}

			return '<div class="fw-shortcode-item" data-shortcode-tag="' + shortcode.tag + '">' +
						'<div class="inner">' +
							iconHtml +
							'<p><span>' + shortcode.title + '</span></p>' +
						'</div>' +
					'</div>';
		}
	}

	/**
	 * Editor Shortcodes V2 extensions integrates well with wp-editor
	 * option type. The wp-editor itself is responsible for having an
	 * attr named data-fw-shortcodes-list. This attr should contain
	 * valid JSON and it should contain a list of shortcodes we should render.
	 */
	function shortcodesListFor (editor) {
		var $wpEditor = jQuery(editor.targetElm).closest(
			'.fw-option-type-wp-editor'
		);

		var isWpEditor = $wpEditor.length > 0;

		if (isWpEditor) {
			return JSON.parse($wpEditor.attr('data-fw-shortcodes-list'));
		}

		return fw_ext_editor_shortcodes_v2_data.default_shortcodes_list;
	}


})(jQuery);

