import _ from 'lodash';

import Immutable from 'immutable';
import {
    validateReducer,
    validateAction
} from 'canonical';

let iterator,
    isDomainMap,
    isActionMap;

/**
 * @param {Object.<string, Object>} map
 * @return {Boolean} If every object property value is a plain object.
 */
isDomainMap = (map) => {
    return _.every(map, _.isPlainObject);
};

/**
 * @param {Object.<string, Function>} map
 * @return {Boolean} If every object property value is a function.
 */
isActionMap = (map) => {
    return _.every(map, _.isFunction);
};

/**
 * @param {Object} domain
 * @param {Object} action
 * @param {String} action.name
 * @param {Object} collection
 * @return {Object} domain
 */
iterator = (domain, action, collection, tapper) => {
    if (!Immutable.Iterable.isIterable(domain)) {
        throw new Error('Domain must be an instance of Immutable.Iterable.');
    }

    // console.log('domain', domain, 'action', action, 'definition', collection);

    _.forEach(collection, (value, domainName) => {
        // console.log('value', value, 'domain', domainName, 'isActionMap', isActionMap(value), 'isDomainMap', isDomainMap(value));

        if (isActionMap(value)) {
            // console.log('action.name', action.name, 'value[action.name]', typeof value[action.name]);

            if (value[action.name]) {
                let result;

                tapper.isActionHandled = true;

                result = value[action.name](domain.get(domainName), action);

                if (!Immutable.Iterable.isIterable(result)) {
                    throw new Error('Reducer must return an instance of Immutable.Iterable. "' + domainName + '" domain "' + action.name + '" action handler result is "' + typeof result + '".');
                }

                domain = domain.set(domainName, result);
            }
        } else if (isDomainMap(value)) {
            domain = domain.set(domainName, iterator(domain.get(domainName), action, value, tapper))
        }
    });

    return domain;
};

/**
 * @param {Object} reducer
 */
export default (reducer) => {
    validateReducer(reducer);

    console.log('CONSTRUCT');

    return (state, action) => {
        let tapper;

        if (action.type && action.type.indexOf('@@') === 0) {
            console.info('Ignoring private action "' + action.type + '". redux-immutable does not support state inflation. Refer to https://github.com/gajus/canonical-reducer-composition/issues/1.');

            return state;
        }

        validateAction(action);

        // Tapper is an object that tracks execution of the action.
        // @todo Make this an opt-in.
        tapper = {
            isActionHandled: false
        };

        state = iterator(state, action, reducer, tapper);

        if (!tapper.isActionHandled) {
            console.warn('Unhandled action "' + action.name + '".', action);
        }

        return state;
    };
};
