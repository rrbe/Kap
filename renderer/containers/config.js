import {Container} from '../utils/state-container';

export default class ConfigContainer extends Container {
  state = {selectedTab: 0};

  setPlugin = async pluginName => {
    const {validators, values} = await window.kap.config.get(pluginName);
    this.setState({
      validators,
      values,
      pluginName
    });
  };

  setEditService = async (pluginName, serviceTitle) => {
    const {validators, values} = await window.kap.config.get(pluginName, serviceTitle);
    this.setState({
      validators,
      values,
      pluginName,
      serviceTitle
    });
  };

  closeWindow = () => window.kap.window.close();

  openConfig = () => window.kap.config.open();

  viewOnGithub = () => window.kap.config.viewOnGithub();

  onChange = async (key, value) => {
    const {validators, values} = await window.kap.config.change(key, value, this.state.serviceTitle);
    this.setState({validators, values});
  };

  selectTab = selectedTab => {
    this.setState({selectedTab});
  };
}
