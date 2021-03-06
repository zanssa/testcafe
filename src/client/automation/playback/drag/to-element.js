import testCafeCore from '../../deps/testcafe-core';
import DragAutomationBase from './base';
import { getDefaultAutomationOffsets } from '../../utils/offsets';

var positionUtils = testCafeCore.positionUtils;


export default class DragToElementAutomation extends DragAutomationBase {
    constructor (element, destinationElement, mouseOptions) {
        super(element, mouseOptions);

        this.destinationElement = destinationElement;
    }

    _getEndPoint () {
        return positionUtils.findCenter(this.destinationElement);
    }

    _getDestination () {
        var element = this.destinationElement;
        var offsets = getDefaultAutomationOffsets(this.destinationElement);

        return { element, offsets };
    }
}
