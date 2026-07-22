import React from 'react';
import PropTypes from 'prop-types';
import {ipcRenderer as ipc} from 'utils/ipc';

import {connect, PreferencesContainer} from '../../../containers';

import General from './general';

class Categories extends React.Component {
  componentDidUpdate(previousProps) {
    if (!previousProps.isMounted && this.props.isMounted) {
      // Wait for the transitions to end
      setTimeout(async () => ipc.callMain('preferences-ready'), 300);
    }
  }

  render() {
    return (
      <div className="categories-container">
        <General/>
        <style jsx>{`
            .categories-container {
              flex: 1;
              display: flex;
              overflow-x: hidden;
              background: var(--background-color);
            }
        `}</style>
      </div>
    );
  }
}

Categories.propTypes = {
  isMounted: PropTypes.bool
};

export default connect(
  [PreferencesContainer],
  ({isMounted}) => ({isMounted})
)(Categories);
