import * as domUtils from './dom';
import * as arrayUtils from './array';


//nodes utils
function getOwnFirstVisibleTextNode (el) {
    var children = el.childNodes;

    if (!children.length && isVisibleTextNode(el))
        return el;

    return arrayUtils.find(children, node => isVisibleTextNode(node));
}

function getOwnFirstVisibleNode (el) {
    return arrayUtils.find(el.childNodes, node => isVisibleTextNode(node) ||
                                                  !isSkippableNode(node) && getOwnFirstVisibleNode(node));
}

function getOwnPreviousVisibleSibling (el) {
    var sibling = null;
    var current = el;

    while (!sibling) {
        current = current.previousSibling;
        if (!current)
            break;
        else if (!isSkippableNode(current) && !isInvisibleTextNode(current)) {
            sibling = current;
            break;
        }
    }
    return sibling;
}

function hasChildren (node) {
    return node.childNodes && node.childNodes.length;
}

function isElementWithChildren (node) {
    return domUtils.isElementNode(node) || hasChildren(node);
}

//NOTE: before such elements (like div or p) adds line breaks before and after it
// (except line break before first visible element in contentEditable parent)
// this line breaks is not contained in node values
//so we should take it into account manually
function isNodeBlockWithBreakLine (parent, node) {
    var parentFirstVisibleChild = null;
    var firstVisibleChild       = null;

    if (domUtils.isShadowUIElement(parent) || domUtils.isShadowUIElement(node))
        return false;

    if (!domUtils.isTheSameNode(node, parent) && node.childNodes.length && /div|p/.test(domUtils.getTagName(node))) {
        parentFirstVisibleChild = getOwnFirstVisibleNode(parent);

        if (!parentFirstVisibleChild || domUtils.isTheSameNode(node, parentFirstVisibleChild))
            return false;

        firstVisibleChild = getFirstVisibleTextNode(parentFirstVisibleChild);
        if (!firstVisibleChild || domUtils.isTheSameNode(node, firstVisibleChild))
            return false;

        return getOwnFirstVisibleTextNode(node);
    }
    return false;
}

function isNodeAfterNodeBlockWithBreakLine (parent, node) {
    var isRenderedNode          = domUtils.isRenderedNode(node);
    var parentFirstVisibleChild = null;
    var firstVisibleChild       = null;
    var previousSibling         = null;

    if (domUtils.isShadowUIElement(parent) || domUtils.isShadowUIElement(node))
        return false;

    if (!domUtils.isTheSameNode(node, parent) &&
        (isRenderedNode && domUtils.isElementNode(node) && node.childNodes.length &&
         !/div|p/.test(domUtils.getTagName(node)) ||
         isVisibleTextNode(node) && !domUtils.isTheSameNode(node, parent) && node.nodeValue.length)) {

        if (isRenderedNode && domUtils.isElementNode(node)) {
            parentFirstVisibleChild = getOwnFirstVisibleNode(parent);

            if (!parentFirstVisibleChild || domUtils.isTheSameNode(node, parentFirstVisibleChild))
                return false;

            firstVisibleChild = getFirstVisibleTextNode(parentFirstVisibleChild);
            if (!firstVisibleChild || domUtils.isTheSameNode(node, firstVisibleChild))
                return false;
        }

        previousSibling = getOwnPreviousVisibleSibling(node);

        return previousSibling && domUtils.isElementNode(previousSibling) &&
               /div|p/.test(domUtils.getTagName(previousSibling)) && getOwnFirstVisibleTextNode(previousSibling);
    }
    return false;
}

export function getFirstVisibleTextNode (el) {
    var children                    = el.childNodes;
    var childrenLength              = children.length;
    var curNode                     = null;
    var child                       = null;
    var isNotContentEditableElement = null;

    if (!childrenLength && isVisibleTextNode(el))
        return el;

    for (var i = 0; i < childrenLength; i++) {
        curNode                     = children[i];
        isNotContentEditableElement = domUtils.isElementNode(curNode) && !domUtils.isContentEditableElement(curNode);

        if (isVisibleTextNode(curNode))
            return curNode;
        else if (domUtils.isRenderedNode(curNode) && isElementWithChildren(curNode) && !isNotContentEditableElement) {
            child = getFirstVisibleTextNode(curNode);

            if (child)
                return child;
        }
    }

    return child;
}

export function getLastTextNode (el, onlyVisible) {
    var children                    = el.childNodes;
    var childrenLength              = children.length;
    var curNode                     = null;
    var child                       = null;
    var isNotContentEditableElement = null;
    var visibleTextNode             = null;

    if (!childrenLength && isVisibleTextNode(el))
        return el;

    for (var i = childrenLength - 1; i >= 0; i--) {
        curNode                     = children[i];
        isNotContentEditableElement = domUtils.isElementNode(curNode) && !domUtils.isContentEditableElement(curNode);
        visibleTextNode             = domUtils.isTextNode(curNode) &&
                                      (onlyVisible ? !isInvisibleTextNode(curNode) : true);

        if (visibleTextNode)
            return curNode;
        else if (domUtils.isRenderedNode(curNode) && isElementWithChildren(curNode) && !isNotContentEditableElement) {
            child = getLastTextNode(curNode, false);

            if (child)
                return child;
        }
    }

    return child;
}

export function getFirstNonWhitespaceSymbolIndex (nodeValue, startFrom) {
    if (!nodeValue || !nodeValue.length)
        return 0;

    var valueLength = nodeValue.length;
    var index       = startFrom || 0;

    for (var i = index; i < valueLength; i++) {
        if (nodeValue.charCodeAt(i) === 10 || nodeValue.charCodeAt(i) === 32)
            index++;
        else
            break;
    }
    return index;
}

export function getLastNonWhitespaceSymbolIndex (nodeValue) {
    if (!nodeValue || !nodeValue.length)
        return 0;

    var valueLength = nodeValue.length;
    var index       = valueLength;

    for (var i = valueLength - 1; i >= 0; i--) {
        if (nodeValue.charCodeAt(i) === 10 || nodeValue.charCodeAt(i) === 32)
            index--;
        else
            break;
    }
    return index;
}

export function isInvisibleTextNode (node) {
    if (!domUtils.isTextNode(node))
        return false;

    var nodeValue         = node.nodeValue;
    var firstVisibleIndex = getFirstNonWhitespaceSymbolIndex(nodeValue);
    var lastVisibleIndex  = getLastNonWhitespaceSymbolIndex(nodeValue);

    return firstVisibleIndex === nodeValue.length && lastVisibleIndex === 0;
}

function isVisibleTextNode (node) {
    return domUtils.isTextNode(node) && !isInvisibleTextNode(node);
}

function isSkippableNode (node) {
    return !domUtils.isRenderedNode(node) || domUtils.isShadowUIElement(node);
}

//dom utils
function hasContentEditableAttr (el) {
    var attrValue = el.getAttribute ? el.getAttribute('contenteditable') : null;

    return attrValue === '' || attrValue === 'true';
}

export function findContentEditableParent (element) {
    var elParents = domUtils.getParents(element);

    if (hasContentEditableAttr(element) && domUtils.isContentEditableElement(element))
        return element;

    var currentDocument = domUtils.findDocument(element);

    if (currentDocument.designMode === 'on')
        return currentDocument.body;

    return arrayUtils.find(elParents, parent => hasContentEditableAttr(parent) &&
                                                domUtils.isContentEditableElement(parent));
}

export function getNearestCommonAncestor (node1, node2) {
    if (domUtils.isTheSameNode(node1, node2)) {
        if (domUtils.isTheSameNode(node2, findContentEditableParent(node1)))
            return node1;
        return node1.parentNode;
    }

    var ancestors             = [];
    var contentEditableParent = findContentEditableParent(node1);
    var curNode               = null;

    if (!domUtils.isElementContainsNode(contentEditableParent, node2))
        return null;

    for (curNode = node1; curNode !== contentEditableParent; curNode = curNode.parentNode)
        ancestors.push(curNode);

    for (curNode = node2; curNode !== contentEditableParent; curNode = curNode.parentNode) {
        if (arrayUtils.indexOf(ancestors, curNode) !== -1)
            return curNode;
    }

    return contentEditableParent;
}

//selection utils
function getSelectedPositionInParentByOffset (node, offset) {
    var currentNode          = null;
    var currentOffset        = null;
    var childCount           = node.childNodes.length;
    var isSearchForLastChild = offset >= childCount;

    // NOTE: we get a child element by its offset index in the parent
    if (domUtils.isShadowUIElement(node))
        return { node, offset };

    // NOTE: IE behavior
    if (isSearchForLastChild)
        currentNode = node.childNodes[childCount - 1];
    else {
        currentNode   = node.childNodes[offset];
        currentOffset = 0;
    }

    // NOTE: skip shadowUI elements
    if (domUtils.isShadowUIElement(currentNode)) {
        if (childCount <= 1)
            return { node, offset: 0 };

        isSearchForLastChild = offset - 1 >= childCount;

        if (isSearchForLastChild)
            currentNode = node.childNodes[childCount - 2];
        else {
            currentNode   = node.childNodes[offset - 1];
            currentOffset = 0;
        }
    }

    // NOTE: we try to find text node
    while (!isSkippableNode(currentNode) && domUtils.isElementNode(currentNode)) {
        if (hasChildren(currentNode))
            currentNode = currentNode.childNodes[isSearchForLastChild ? currentNode.childNodes.length - 1 : 0];
        else {
            //NOTE: if we didn't find a text node then always set offset to zero
            currentOffset = 0;
            break;
        }
    }

    if (currentOffset !== 0 && !isSkippableNode(currentNode))
        currentOffset = currentNode.nodeValue ? currentNode.nodeValue.length : 0;

    return {
        node:   currentNode,
        offset: currentOffset
    };
}

function getSelectionStart (el, selection, inverseSelection) {
    var startNode   = inverseSelection ? selection.focusNode : selection.anchorNode;
    var startOffset = inverseSelection ? selection.focusOffset : selection.anchorOffset;

    var correctedStartPosition = {
        node:   startNode,
        offset: startOffset
    };

    //NOTE: window.getSelection() can't returns not rendered node like selected node, so we shouldn't check it
    if ((domUtils.isTheSameNode(el, startNode) || domUtils.isElementNode(startNode)) && hasChildren(startNode))
        correctedStartPosition = getSelectedPositionInParentByOffset(startNode, startOffset);

    return {
        node:   correctedStartPosition.node,
        offset: correctedStartPosition.offset
    };
}

function getSelectionEnd (el, selection, inverseSelection) {
    var endNode   = inverseSelection ? selection.anchorNode : selection.focusNode;
    var endOffset = inverseSelection ? selection.anchorOffset : selection.focusOffset;

    var correctedEndPosition = {
        node:   endNode,
        offset: endOffset
    };

    //NOTE: window.getSelection() can't returns not rendered node like selected node, so we shouldn't check it
    if ((domUtils.isTheSameNode(el, endNode) || domUtils.isElementNode(endNode)) && hasChildren(endNode))
        correctedEndPosition = getSelectedPositionInParentByOffset(endNode, endOffset);

    return {
        node:   correctedEndPosition.node,
        offset: correctedEndPosition.offset
    };
}

export function getSelection (el, selection, inverseSelection) {
    return {
        startPos: getSelectionStart(el, selection, inverseSelection),
        endPos:   getSelectionEnd(el, selection, inverseSelection)
    };
}

export function getSelectionStartPosition (el, selection, inverseSelection) {
    var correctedSelectionStart = getSelectionStart(el, selection, inverseSelection);

    return calculatePositionByNodeAndOffset(el, correctedSelectionStart);
}

export function getSelectionEndPosition (el, selection, inverseSelection) {
    var correctedSelectionEnd = getSelectionEnd(el, selection, inverseSelection);

    return calculatePositionByNodeAndOffset(el, correctedSelectionEnd);
}

export function calculateNodeAndOffsetByPosition (el, offset) {
    var point = {
        node:   null,
        offset: offset
    };

    function checkChildNodes (target) {
        var childNodes = target.childNodes;

        if (point.node)
            return point;

        if (isSkippableNode(target))
            return point;

        if (domUtils.isTextNode(target)) {
            if (point.offset <= target.nodeValue.length) {
                point.node = target;
                return point;
            }
            else if (target.nodeValue.length) {
                if (!point.node && isNodeAfterNodeBlockWithBreakLine(el, target))
                    point.offset--;

                point.offset -= target.nodeValue.length;
            }
        }
        else if (domUtils.isElementNode(target)) {
            if (point.offset === 0 && !getContentEditableValue(target).length) {
                point.node = target;
                return point;
            }
            if (!point.node && (isNodeBlockWithBreakLine(el, target) || isNodeAfterNodeBlockWithBreakLine(el, target)))
                point.offset--;
            else if (!childNodes.length && domUtils.isElementNode(target) && domUtils.getTagName(target) === 'br')
                point.offset--;
        }

        arrayUtils.forEach(childNodes, node => {
            point = checkChildNodes(node);
        });

        return point;
    }

    return checkChildNodes(el);
}

export function calculatePositionByNodeAndOffset (el, { node, offset }) {
    var currentOffset = 0;
    var find          = false;

    function checkChildNodes (target) {
        var childNodes = target.childNodes;

        if (find)
            return currentOffset;

        if (domUtils.isTheSameNode(node, target)) {
            if (isNodeBlockWithBreakLine(el, target) || isNodeAfterNodeBlockWithBreakLine(el, target))
                currentOffset++;

            find = true;
            return currentOffset + offset;
        }

        if (isSkippableNode(target))
            return currentOffset;

        if (!childNodes.length && target.nodeValue && target.nodeValue.length) {
            if (!find && isNodeAfterNodeBlockWithBreakLine(el, target))
                currentOffset++;

            currentOffset += target.nodeValue.length;
        }

        else if (!childNodes.length && domUtils.isElementNode(target) && domUtils.getTagName(target) === 'br')
            currentOffset++;

        else if (!find && (isNodeBlockWithBreakLine(el, target) || isNodeAfterNodeBlockWithBreakLine(el, target)))
            currentOffset++;

        arrayUtils.forEach(childNodes, currentNode => {
            currentOffset = checkChildNodes(currentNode);
        });

        return currentOffset;
    }

    return checkChildNodes(el);
}

export function getElementBySelection (selection) {
    var el = getNearestCommonAncestor(selection.anchorNode, selection.focusNode);

    return domUtils.isTextNode(el) ? el.parentElement : el;
}

//NOTE: We can not determine first visible symbol of node in all cases,
// so we should create a range and select all text contents of the node.
// Then range object will contain information about node's the first and last visible symbol.
export function getFirstVisiblePosition (el) {
    var firstVisibleTextChild = domUtils.isTextNode(el) ? el : getFirstVisibleTextNode(el);
    var curDocument           = domUtils.findDocument(el);
    var range                 = curDocument.createRange();

    if (firstVisibleTextChild) {
        range.selectNodeContents(firstVisibleTextChild);

        return calculatePositionByNodeAndOffset(el, { node: firstVisibleTextChild, offset: range.startOffset });
    }

    return 0;
}

export function getLastVisiblePosition (el) {
    var lastVisibleTextChild = domUtils.isTextNode(el) ? el : getLastTextNode(el, true);
    var curDocument          = domUtils.findDocument(el);
    var range                = curDocument.createRange();

    if (lastVisibleTextChild) {
        range.selectNodeContents(lastVisibleTextChild);

        return calculatePositionByNodeAndOffset(el, { node: lastVisibleTextChild, offset: range.endOffset });
    }

    return 0;
}

//contents util
export function getContentEditableValue (target) {
    var elementValue = '';
    var childNodes   = target.childNodes;

    if (isSkippableNode(target))
        return elementValue;

    if (!childNodes.length && domUtils.isTextNode(target))
        return target.nodeValue;
    else if (childNodes.length === 1 && domUtils.isTextNode(childNodes[0]))
        return childNodes[0].nodeValue;

    arrayUtils.forEach(childNodes, node => {
        elementValue += getContentEditableValue(node);
    });

    return elementValue;
}
