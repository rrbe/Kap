import {Container} from '../utils/state-container';
import {ipcRenderer as ipc} from 'utils/ipc';
import {settings} from '../utils/settings';

export default class PreferencesContainer extends Container {
  state = {
    isMounted: false
  };

  mount = async () => {
    const initial = await window.kap.preferences.get();
    this.settings = settings;
    this.defaultInputDeviceId = initial.defaultInputDeviceId;

    this.setState({
      shortcuts: {},
      ...initial.settings,
      openOnStartup: initial.openOnStartup,
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

  toggleSetting = (setting, value) => {
    const newValue = value === undefined ? !this.state[setting] : value;
    this.setState({[setting]: newValue});
    this.settings.set(setting, newValue);
  };

  toggleRecordAudio = async () => {
    const newValue = !this.state.recordAudio;

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
