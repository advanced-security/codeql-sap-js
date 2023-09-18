sap.ui.define(
	[
		"sap/ui/core/Control",
		"sap/m/Button",
		"sap/m/Image",
		"sap/m/Link",
		"sap/m/Text",
	],
	function (Control, Button, Image, Link, Text) {
		"use strict";

		var Book = Control.extend("ghas.sample.controls.Book", {
			// the control API:
			metadata: {
				properties: {
					/* Business Object properties */
					title: { type: "string" },

					/* other (configuration) properties */
					width: {
						type: "sap.ui.core.CSSSize",
						defaultValue: "400px",
					},
					height: {
						type: "sap.ui.core.CSSSize",
						defaultValue: "400px",
					},

					// only for demonstration
					someObject: { type: "object" },
					whatever: { type: "any" },
				},

				aggregations: {
					_buyButton: {
						type: "sap.m.Button",
						multiple: false,
						visibility: "hidden",
					},
					// coverPicture: {
					// 	type: "sap.m.Image",
					// 	multiple: false,
					// 	visibility: "public",
					// },
				},

				associations: {
					relatedBooks: {
						type: "ghas.sample.controls.Book",
						multiple: true,
						singularName: "relatedBook",
					},
				},

				events: {
					buy: { enablePreventDefault: true },
				},
			},

			// be careful with this, better avoid it!
			// See why at https://www.nabisoft.com/tutorials/sapui5/why-initializing-properties-on-prototypes-can-have-nasty-side-effects-in-sapui5
			//_oLink : null,

			init: function () {
				var oControl = this,
					oBuyBtn,
					oCoverPic;

				this._oLink = new Link();
				//do something with the link
				//...

				//create a button for buying that book
				oBuyBtn = new Button({
					text: "Buy this book",
					press: function (oEvent) {
						oControl.fireBuy({
							someData:
								"some data I want to pass along with the event object",
						});
					},
				});
				this.setAggregation("_buyButton", oBuyBtn);

				//create and initialize the cover picture, but we don't have a src yet
				oCoverPic = new Image({
					decorative: true,
					width: "150px",
					height: "200px",
					tooltip: "Cover of book",
				});
				oCoverPic.addStyleClass("nsBookCvrPic");
				// this.setCoverPicture(oCoverPic);
			},

			onAfterRendering: function () {
				//called after instance has been rendered (it's in the DOM)
			},

			_somePrivateMethod: function () {
				/*do someting...*/
			},

			somePublicMethod: function () {
				/*do someting...*/
			},

			renderer: {
				render: function (oRm, oControl) {
					oRm.write("<div");
					oRm.writeControlData(oControl);

					oRm.addClass("nsBook");
					oRm.writeClasses();

					oRm.addStyle("width", oControl.getWidth());
					oRm.addStyle("height", oControl.getHeight());
					oRm.writeStyles();

					oRm.write(">");

					//content:

					// oRm.write("<div>");
					// oRm.renderControl(oControl.getCoverPicture());
					// oRm.write("</div>");

					//we don't do any fancy stuff because we are lazy ;-)
					//oRm.writeEscaped("<div>escape this</div>");
					oRm.write("<div>");
					oRm.write(
						"<div>Title            : " +
							oControl.getTitle() +
							"</div>"
					);
					oRm.write(
						"<div>Author           : " +
							oControl.getAuthor() +
							"</div>"
					);
					oRm.write(
						"<div>Description      : " +
							oControl.getDescription() +
							"</div>"
					);
					oRm.write(
						"<div>Comments         : <br>" +
							oControl.getComments().join("<br>") +
							"</div>"
					);
					oRm.write(
						"<div>Pages            : " +
							oControl.getNumberOfPages() +
							"</div>"
					);
					oRm.write(
						"<div>Express Delivery : " +
							oControl.getExpressDelivery() +
							"</div>"
					);
					oRm.write("<div>");
					oRm.renderControl(oControl.getAggregation("_buyButton"));
					oRm.write("</div>");
					oRm.write("</div>");

					oRm.write("</div>"); // close the nsBook div
				},
			},
		});

		//overwrite setter
		// ghas.sample.controls.Book.prototype.setCoverPictureUrl = function (
		// 	sVal
		// ) {
		// 	if (sVal) {
		// 		this.setProperty(
		// 			"coverPictureUrl",
		// 			sVal,
		// 			/*suppressInvalidate*/ true
		// 		); //do not re-render
		// 		this.getCoverPicture().setSrc(sVal);
		// 	}
		// };

		ghas.sample.controls.Book.prototype.exit = function () {
			/* release resources that are not released by the SAPUI5 framework */
			if (this._oLink) {
				this._oLink.destroy();
				delete this._oLink;
			}
		};

		return Book;
	}
);
