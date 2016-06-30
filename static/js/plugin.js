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
				onclick: function (e) {
					var tag;

					if ($(e.target).hasClass('fw-shortcode-item')) {
						tag = $(e.target).attr('data-shortcode-tag');
					} else if (editor.dom.getParent(e.target, '.fw-shortcode-item')) {
						tag = $(editor.dom.getParent(e.target, '.fw-shortcode-item')).attr('data-shortcode-tag');
					} else {
						return false;
					}

					console.log(tag);

					if (tag) {
						tinyMCE.activeEditor.execCommand("insertShortcode", false, {tag: tag});
					}

					this.hide();
				}
			},
			onclick: fixPanelPosition,
			tooltip: fw_ext_editor_shortcodes_v2_data.button_title
		});

		editor.addCommand('insertShortcode', function (ui, params) {
			var node,
				p,
				content = getVisualElementHtml(params.tag);

			console.log(content);

			if (node = editor.dom.getParent(editor.selection.getNode())) {
				p = editor.dom.create('p');
				editor.dom.insertAfter(p, node);
				editor.selection.setCursorLocation(p, 0);
				editor.nodeChanged();
			}

			editor.execCommand("mceInsertContent", false, content);
		});

		//disable drag&drop in firefox
		editor.on('mousedown', function(e){
			if ( $(e.target).hasClass('unselectable') ) {
				e.stopPropagation();
				return false;
			}
		});

		//replace tags with html block
		editor.on('BeforeSetContent', function (event) {
			console.log("do an actual visual element replace");
			return;
			if (event.content.match(tag_regex)) {
				event.content = _self.getHTML(event.content);
			}
		});

		//replace all html content with tags
		editor.on('PostProcess', function (event) {
			console.log("restore tags back");
			return;
			if (event.get) {
				event.content = _self.getTags(event.content);
			}
		});
	}

	function getVisualElementHtml (tag) {
		var shortcode = dataFor(tag);

		var icon = getShortcodeIcon(tag);

		icon = jQuery(
			'<div>' + icon + '</div>'
		);

		icon.children()
			.addClass('mceItem mceNonEditable unselectable')
			.attr('contenteditable', 'false')
			.filter('span,i,em').html('&nbsp;');
		icon = icon.html();

		return '' +
			'<span data-shortcode-tag="' + tag + '" class="mceNonEditable mceItem fw-shortcode unselectable" contenteditable="false">' +
				'<span class="mceItem fw-component-bar mceNonEditable unselectable" contenteditable="false">' +
					icon +
					'<span class="mceItem mceNonEditable unselectable" contenteditable="false">' + shortcode.title + '</span>' +
					'<span class="fw-item-buttons mceItem fw-component-controls mceNonEditable unselectable">' +
						'<i class="mceItem mceNonEditable unselectable dashicons dashicons-admin-generic fw-item-edit">&nbsp;</i>' +
						'<i class="mceItem mceNonEditable unselectable dashicons dashicons-admin-page fw-item-clone">&nbsp;</i>' +
						'<i class="mceItem mceNonEditable unselectable dashicons dashicons-no fw-item-delete">&nbsp;</i>' +
					'</span>' +
					'<span class="mceItem mceNonEditable fw-component-title unselectable fw-hide" style="display: none">3Nd0fL1N3Sh0rtC0d3</span>' +
				'</span>' +
			'</span>';
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

		function singleShortcodeHtml (shortcode) {
			return '<div class="fw-shortcode-item" data-shortcode-tag="' + shortcode.tag + '">' +
						'<div class="inner">' +
							getShortcodeIcon(shortcode.tag) +
							'<p><span>' + shortcode.title + '</span></p>' +
						'</div>' +
					'</div>';
		}
	}

	function getShortcodeIcon (tag) {
		var iconHtml = null;
		var shortcode = dataFor(tag);

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

		return iconHtml || '';
	}

	function fixPanelPosition (e) {
		try {
			var id = e.control.panel._id,
				$panel = $('#' + id + '.mce-fw-shortcodes-container'),
				oldPos = $panel.data('left');
			if (typeof oldPos === 'undefined' ) {
				oldPos = parseInt($panel.css('left'));
				$panel.data('left', oldPos);
			}

			$panel.css('left',(oldPos - 216)+'px');
			$panel.css('height', '');
		} catch (e) {
			//sometime _id is undefined
			return false;
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

	function dataFor (shortcode) {
		return _.findWhere(
			fw_ext_editor_shortcodes_v2_data.shortcodes,
			{tag: shortcode}
		);
	}
})(jQuery);

