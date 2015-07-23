/*\
title: $:/bj/modules/widgets/mrevealdom.js
type: application/javascript
module-type: widget

Reveal widget

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";
//alert = function () {};
var count = 0;
var Widget = require("$:/bj/modules/widgets/msgwidget.js").msgwidget;

var RevealWidget = function(parseTreeNode,options) {
	this.initialise(parseTreeNode,options);
};

/*
Inherit from the base widget class
*/
RevealWidget.prototype = new Widget();



/*
Render this widget into the DOM
*/
RevealWidget.prototype.render = function(parent,nextSibling) {
	this.statea = null;
	this.isOpen = false;
	this.parentDomNode = parent;
	this.computeAttributes();
	this.execute();
	var tag = this.parseTreeNode.isBlock ? "div" : "span";
	if(this.revealTag && $tw.config.htmlUnsafeElements.indexOf(this.revealTag) === -1) {
		tag = this.revealTag;
	}
	var domNode = this.document.createElement(tag);
	var classes = this["class"].split(" ") || [];
	classes.push("tc-reveal");
	domNode.className = classes.join(" ");
	if(this.style) {
		domNode.setAttribute("style",this.style);
	}
	parent.insertBefore(domNode,nextSibling);
	this.renderChildren(domNode,null);//if there is not a matching default then there will not be children - see execute.

	if(!this.toOpen) {
		domNode.setAttribute("hidden","true");
	}
	this.domNodes.push(domNode);alert("ren"+this.domNodes.length)
	this.isOpen = this.toOpen;
	/////////////	
	count++;
	this["cb"+count] = this.handlesetvalEvent;
	this.handlename = "cb"+count;
	///////////
	domNode.setAttribute("id",this.handlename);//link the dom with the callback
	
	var aux = {isOpen:this.isOpen, type:this.type, text:this.text,closeAnimation:this.closeAnimation,openAnimation:this.openAnimation};
	//bj addIdEventListeners adds callback function handleNavigateEvent to this widget instance with key = id/type
	// there will be a removeIdEventListeners ([{type: "tm-navigate", id:this.id}]) which widget calls on closing down
	if (this.Id) {			
		this.addIdEventListeners([
			{type: "bjm-setval", handler: this.handlename, id:this.Id, aux:aux}
		]);
	}
};

/*
Compute the internal state of the widget
*/
RevealWidget.prototype.execute = function() {
	// Get our parameters

	this.state = this.getAttribute("state");
	this.Id = this.getAttribute("Id");
	this.revealTag = this.getAttribute("tag");
	this.type = this.getAttribute("type");
	this.text = this.getAttribute("text");
	this.position = this.getAttribute("position");
	this["class"] = this.getAttribute("class","");
	this.style = this.getAttribute("style","");
	this["default"] = this.getAttribute("default","");
	this.animate = this.getAttribute("animate","no");
	this.openAnimation = this.animate === "no" ? undefined : "open";
	this.closeAnimation = this.animate === "no" ? undefined : "close";
	// Compute the title of the state tiddler and read it
	this.stateTitle = this.state;
	this.toOpen = this.readState();

	// Construct the child widgets
	var childNodes = this.parseTreeNode.children;//Note that when rending there can be no children
	this.hasChildNodes = true;
	this.makeChildWidgets(childNodes);
};


/*Remove any DOM nodes created by this widget or its children
*/
RevealWidget.prototype.removeChildDomNodes = function() {
alert(this.text+ "dom remove")
	// If this widget has directly created DOM nodes, delete them and exit. This assumes that any child widgets are contained within the created DOM nodes, which would normally be the case
	$tw.utils.each(this.children,function(childWidget) {
			childWidget.removeChildDomNodes();
		});
	if(this.domNodes.length > 0) {
		$tw.utils.each(this.domNodes,function(domNode) {
			domNode.parentNode.removeChild(domNode);
		});
		this.domNodes = [];
	}
	this.delIdEventListeners([
		{type: "bjm-setval", handler: this.handlename, id:this.Id}
	]);
};
/*
Read the state tiddler
*/
RevealWidget.prototype.readState = function() {
	// Read the information from the state tiddler
	var state, toOpen;
	if (this.statea) {
		state = this.statea;// this.statea = null;
	}
	else
	  state = this["default"];
	  
	switch(this.type) {
		case "match":
			toOpen = state === this.text;
			break;
		case "nomatch":
			toOpen = state === this.text;
			toOpen  = !toOpen;
			break;
	}
	return toOpen;
};

/*
need to register this function - $tw.instantmsg.reg("bjm-setstate", this.id, this.setmessage) - returns the handle for easy managing teardown
follow pattern of this.domnodes

	this.msgs.push( $tw.instantmsg.reg("bjm-setstate", this.id, this.setmessage));

then on teardown  call 
* for (i = 0 to this.msg.length) this.msg.remove();

need to bind the callback to this widget
need a $tw.actionmsg(messge,id,value) - simple lookup message and call it - no need to register the actionmsg
*/

RevealWidget.prototype.handlesetvalEvent = function(event,aux) {
	//in the reduced case, the domnode with be passed here.
	var domNode = aux.domNode?aux.domNode:this.domNodes[0];
	this.setmessage(event.paramObject.state, aux, domNode) //event.paramObject.state is the changed state (in a string) sent to use from the source.
}

RevealWidget.prototype.setmessage = function(state, internals, domNode) {
	var refreshed = false,
		toOpen;

	switch(this.type) {
		case "match":
			toOpen = state === internals.text;//alert(state+" state M toopen="+toOpen);
			break;
		case "nomatch":
			toOpen = state === internals.text;//alert(state+" state noM toopen"+toOpen);
			toOpen = !toOpen;
			break;
	}
	if(toOpen !== internals.isOpen) {

		
		// Animate our DOM node
		if(!internals.isOpen) {
			domNode.removeAttribute("hidden");
			$tw.anim.perform(internals.openAnimation,domNode);
			internals.isOpen = true;
		} else {
			$tw.anim.perform(internals.closeAnimation,domNode,{callback: function() {
				domNode.setAttribute("hidden","true");
			}});
			internals.isOpen = false;
		}
	} else {}//alert(state+" state M isopen"+this.isOpen +" toopen"+toOpen+"text"+this.text);}
};

/*
Selectively refreshes the widget if needed. Returns true if the widget or any of its children needed re-rendering
*/
RevealWidget.prototype.refresh = function(changedTiddlers) {
	var changedAttributes = this.computeAttributes();
	if(changedAttributes.state || changedAttributes.type || changedAttributes.text || changedAttributes.position || changedAttributes["default"] || changedAttributes.animate) {
		this.refreshSelf();
		return true;
	} else {
		return this.refreshChildren(changedTiddlers);
	}
};

/*
Called by refresh() to dynamically show or hide the content
*/
RevealWidget.prototype.updateState = function() {alert("update "+this.domNodes.length)

	var domNode = this.domNodes[0];
	// Animate our DOM node
	if(!this.isOpen) {
		domNode.removeAttribute("hidden");
        $tw.anim.perform(this.openAnimation,domNode);
        this.isOpen = true;
	} else {
		$tw.anim.perform(this.closeAnimation,domNode,{callback: function() {
			domNode.setAttribute("hidden","true");
        }});
        this.isOpen = false;
	}
};

exports["mrevealdom"] = RevealWidget;

})();
