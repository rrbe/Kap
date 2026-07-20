import {Container} from 'unstated';
import {ipcRenderer as ipc} from 'electron-better-ipc';
import {settings} from '../utils/settings';

const SETTINGS_ANALYTICS_BLACKLIST = ['kapturesDir'];

export default class PreferencesContainer extends Container {
  state = {
    category: 'general',
    tab: 'discover',
    isMounted: false
  };

  mount = async setOverlay => {
    this.setOverlay = setOverlay;
    const initial = await window.kap.preferences.get();
    this.settings = settings;
    this.defaultInputDeviceId = initial.defaultInputDeviceId;
    this.pluginsDir = initial.pluginsDir;
    const pluginsInstalled = initial.pluginsInstalled.sort((a, b) => a.prettyName.localeCompare(b.prettyName));

    this.fetchFromNpm();

    this.setState({
      shortcuts: {},
      ...initial.settings,
      openOnStartup: initial.openOnStartup,
      pluginsInstalled,
      isMounted: true,
      shortcutMap: initial.shortcuts
    });

    if (initial.settings.recordAudio) {
      this.getAudioDevices();
    }
  };

  getAudioDevices = async () => {
    const audioInputDeviceId = this.settings.get('audioInputDeviceId');
    const {devices: audioDevices, defaultDevice} = await window.kap.preferences.getAudioDevices();
    const currentDefaultName = defaultDevice?.name;
    const updates = {
      audioDevices: [
        {name: `System Default${currentDefaultName ? ` (${currentDefaultName})` : ''}`, id: this.defaultInputDeviceId},
        ...audioDevices
      ],
      audioInputDeviceId
    };

    if (!audioDevices.some(device => device.id === audioInputDeviceId)) {
      updates.audioInputDeviceId = this.defaultInputDeviceId;
      this.settings.set('audioInputDeviceId', this.defaultInputDeviceId);
    }

    this.setState(updates);
  };

  scrollIntoView = (tabId, pluginId) => {
    const plugin = document.querySelector(`#${tabId} #${pluginId}`).parentElement;
    plugin.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
      inline: 'nearest'
    });
  };

  openTarget = async target => {
    const isInstalled = this.state.pluginsInstalled.some(plugin => plugin.name === target.name);
    const isFromNpm = this.state.pluginsFromNpm && this.state.pluginsFromNpm.some(plugin => plugin.name === target.name);

    if (target.action === 'install') {
      if (isInstalled) {
        this.scrollIntoView(this.state.tab, target.name);
        this.setState({category: 'plugins'});
      } else if (isFromNpm) {
        this.scrollIntoView('discover', target.name);
        this.setState({category: 'plugins', tab: 'discover'});

        const {response} = await window.kap.dialog.showMessage({
          type: 'question',
          buttons: [
            'Install',
            'Cancel'
          ],
          defaultId: 0,
          cancelId: 1,
          message: `Do you want to install the “${target.name}” plugin?`
        });

        if (response === 0) {
          this.install(target.name);
        }
      } else {
        this.setState({category: 'plugins'});
      }
    } else if (target.action === 'configure' && isInstalled) {
      this.openPluginsConfig(target.name);
    } else {
      this.setState({category: 'plugins'});
    }
  };

  setNavigation = ({category, tab, target}) => {
    if (target) {
      if (this.state.isMounted) {
        this.openTarget(target);
      } else {
        this.setState({target});
      }
    } else {
      this.setState({category, tab});
    }
  };

  fetchFromNpm = async () => {
    try {
      const plugins = await window.kap.preferences.getPluginsFromNpm();
      this.setState({
        npmError: false,
        pluginsFromNpm: plugins.sort((a, b) => {
          if (a.isCompatible !== b.isCompatible) {
            return b.isCompatible - a.isCompatible;
          }

          return a.prettyName.localeCompare(b.prettyName);
        })
      });

      if (this.state.target) {
        this.openTarget(this.state.target);
        this.setState({target: undefined});
      }
    } catch {
      this.setState({npmError: true});
    }
  };

  togglePlugin = plugin => {
    if (plugin.isInstalled) {
      this.uninstall(plugin.name);
    } else {
      this.install(plugin.name);
    }
  };

  install = async name => {
    const {pluginsInstalled, pluginsFromNpm} = this.state;

    this.setState({pluginBeingInstalled: name});
    const result = await window.kap.preferences.installPlugin(name);

    if (result) {
      this.setState({
        pluginBeingInstalled: undefined,
        pluginsFromNpm: pluginsFromNpm.filter(p => p.name !== name),
        pluginsInstalled: [result, ...pluginsInstalled].sort((a, b) => a.prettyName.localeCompare(b.prettyName))
      });
    } else {
      this.setState({
        pluginBeingInstalled: undefined
      });
    }
  };

  uninstall = async name => {
    const {pluginsInstalled, pluginsFromNpm} = this.state;

    const onTransitionEnd = async () => {
      const plugin = await window.kap.preferences.uninstallPlugin(name);
      this.setState({
        pluginsInstalled: pluginsInstalled.filter(p => p.name !== name),
        pluginsFromNpm: [plugin, ...pluginsFromNpm].sort((a, b) => a.prettyName.localeCompare(b.prettyName)),
        pluginBeingUninstalled: null,
        onTransitionEnd: null
      });
    };

    this.setState({pluginBeingUninstalled: name, onTransitionEnd});
  };

  openPluginsConfig = async name => {
    window.kap.preferences.track(`plugin/config/${name}`);
    this.scrollIntoView('installed', name);
    this.setState({category: 'plugins'});
    this.setOverlay(true);
    await window.kap.preferences.openPluginConfig(name);
    ipc.callMain('refresh-usage');
    this.setOverlay(false);
  };

  openPluginsFolder = () => window.kap.shell.openPath(this.pluginsDir);

  selectCategory = category => {
    this.setState({category});
  };

  selectTab = tab => {
    window.kap.preferences.track(`preferences/tab/${tab}`);
    this.setState({tab});
  };

  toggleSetting = (setting, value) => {
    const newValue = value === undefined ? !this.state[setting] : value;
    if (!SETTINGS_ANALYTICS_BLACKLIST.includes(setting)) {
      window.kap.preferences.track(`preferences/setting/${setting}/${newValue}`);
    }

    this.setState({[setting]: newValue});
    this.settings.set(setting, newValue);
  };

  toggleRecordAudio = async () => {
    const newValue = !this.state.recordAudio;
    window.kap.preferences.track(`preferences/setting/recordAudio/${newValue}`);

    if (!newValue || await window.kap.preferences.ensureMicrophonePermissions()) {
      if (newValue) {
        try {
          await this.getAudioDevices();
        } catch (error) {
          window.kap.preferences.showError(error.message);
        }
      }

      this.setState({recordAudio: newValue});
      this.settings.set('recordAudio', newValue);
    }
  };

  toggleShortcuts = async () => {
    const setting = 'enableShortcuts';
    const newValue = !this.state[setting];
    this.toggleSetting(setting, newValue);
    await ipc.callMain('toggle-shortcuts', {enabled: newValue});
  };

  updateShortcut = async (setting, shortcut) => {
    try {
      await ipc.callMain('update-shortcut', {setting, shortcut});
      this.setState({
        shortcuts: {
          ...this.state.shortcuts,
          [setting]: shortcut
        }
      });
    } catch (error) {
      console.warn('Error updating shortcut', error);
    }
  };

  setOpenOnStartup = value => {
    const openOnStartup = typeof value === 'boolean' ? value : !this.state.openOnStartup;
    this.setState({openOnStartup});
    window.kap.preferences.setOpenOnStartup(openOnStartup);
  };

  pickKapturesDir = async () => {
    const directory = await window.kap.dialog.pickDirectory();
    if (directory) {
      this.toggleSetting('kapturesDir', directory);
    }
  };

  setAudioInputDeviceId = id => {
    this.setState({audioInputDeviceId: id});
    this.settings.set('audioInputDeviceId', id);
  };
}
