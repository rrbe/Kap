import React from 'react';
import PropTypes from 'prop-types';

import {connect, PreferencesContainer} from '../../../containers';

import Item from '../item';
import Switch from '../item/switch';
import Button from '../item/button';
import Select from '../item/select';
import ShortcutInput from '../shortcut-input';

import Category from './category';

class General extends React.Component {
  static defaultProps = {
    audioDevices: [],
    kapturesDir: '',
    category: 'general'
  };

  state = {highlightClicksSupported: window.kap.app.getInfo().highlightClicksSupported};

  openKapturesDir = () => {
    window.kap.shell.openPath(this.props.kapturesDir);
  };

  render() {
    const {
      kapturesDir,
      openOnStartup,
      allowAnalytics,
      showCursor,
      highlightClicks,
      record60fps,
      enableShortcuts,
      loopExports,
      toggleSetting,
      toggleRecordAudio,
      audioInputDeviceId,
      setAudioInputDeviceId,
      audioDevices,
      recordAudio,
      recordSystemAudio,
      pickKapturesDir,
      setOpenOnStartup,
      updateShortcut,
      toggleShortcuts,
      category,
      hardwareAcceleratedExports,
      lossyCompression,
      shortcuts,
      shortcutMap
    } = this.props;

    const {highlightClicksSupported} = this.state;

    const devices = audioDevices.map(device => ({
      label: device.name,
      value: device.id
    }));

    const homeDirectory = window.kap.app.getInfo().homeDirectory;
    const kapturesDirPath = kapturesDir === homeDirectory || kapturesDir.startsWith(`${homeDirectory}/`) ? kapturesDir.replace(homeDirectory, '~') : kapturesDir;
    const tabIndex = category === 'general' ? 0 : -1;
    const fpsOptions = [{label: '30 FPS', value: false}, {label: '60 FPS', value: true}];

    return (
      <Category>
        <Item
          key="showCursor"
          parentItem
          title="Show cursor"
          subtitle="Display the mouse cursor in your Kaptures"
        >
          <Switch
            tabIndex={tabIndex}
            checked={showCursor}
            onClick={
              () => {
                if (showCursor) {
                  toggleSetting('highlightClicks', false);
                }

                toggleSetting('showCursor');
              }
            }/>
        </Item>
        {
          highlightClicksSupported &&
          <Item key="highlightClicks" subtitle="Highlight clicks">
            <Switch
              tabIndex={tabIndex}
              checked={highlightClicks}
              disabled={!showCursor}
              onClick={() => toggleSetting('highlightClicks')}
            />
          </Item>
        }
        <Item
          key="enableShortcuts"
          parentItem
          title="Keyboard shortcuts"
          subtitle="Toggle and customise keyboard shortcuts"
          help="You can paste any valid Electron accelerator string like Command+Shift+5"
        >
          <Switch tabIndex={tabIndex} checked={enableShortcuts} onClick={toggleShortcuts}/>
        </Item>
        {
          enableShortcuts && Object.entries(shortcutMap).map(([key, title]) => (
            <Item key={key} subtitle={title}>
              <ShortcutInput
                shortcut={shortcuts[key]}
                tabIndex={tabIndex}
                onChange={shortcut => updateShortcut(key, shortcut)}
              />
            </Item>
          ))
        }
        <Item
          key="loopExports"
          title="Loop exports"
          subtitle="Infinitely loop exports when supported"
        >
          <Switch tabIndex={tabIndex} checked={loopExports} onClick={() => toggleSetting('loopExports')}/>
        </Item>
        <Item
          key="recordSystemAudio"
          title="System audio"
          subtitle="Include audio played by apps and the system"
        >
          <Switch
            tabIndex={tabIndex}
            checked={recordSystemAudio}
            onClick={() => toggleSetting('recordSystemAudio')}/>
        </Item>
        <Item
          key="recordAudio"
          parentItem
          title="Audio recording"
          subtitle="Record audio from input device"
        >
          <Switch
            tabIndex={tabIndex}
            checked={recordAudio}
            onClick={toggleRecordAudio}/>
        </Item>
        {
          recordAudio &&
          <Item key="audioInputDeviceId" subtitle="Select input device">
            <Select
              tabIndex={tabIndex}
              options={devices}
              selected={audioInputDeviceId}
              placeholder="Select Device"
              noOptionsMessage="No input devices"
              onSelect={setAudioInputDeviceId}/>
          </Item>
        }
        <Item
          key="record60fps"
          title="Capture frame rate"
          subtitle="Increased FPS impacts performance and file size"
        >
          <Select
            tabIndex={tabIndex}
            options={fpsOptions}
            selected={record60fps}
            onSelect={value => toggleSetting('record60fps', value)}/>
        </Item>
        <Item
          key="allowAnalytics"
          title="Console diagnostics"
          subtitle="Print anonymous usage events to the process console; nothing is saved"
        >
          <Switch tabIndex={tabIndex} checked={allowAnalytics} onClick={() => toggleSetting('allowAnalytics')}/>
        </Item>
        <Item
          key="openOnStartup"
          title="Start automatically"
          subtitle="Launch Kap on system startup"
        >
          <Switch tabIndex={tabIndex} checked={openOnStartup} onClick={setOpenOnStartup}/>
        </Item>
        <Item
          key="pickKapturesDir"
          title="Save to…"
          subtitle={kapturesDirPath}
          tooltip={kapturesDir}
          onSubtitleClick={this.openKapturesDir}
        >
          <Button tabIndex={tabIndex} title="Choose" onClick={pickKapturesDir}/>
        </Item>
        <Item
          key="hardwareAcceleratedExports"
          title="Hardware-accelerated exports"
          subtitle="Reduce H.264 and HEVC export CPU usage with VideoToolbox"
        >
          <Switch
            tabIndex={tabIndex}
            checked={hardwareAcceleratedExports}
            onClick={() => toggleSetting('hardwareAcceleratedExports')}
          />
        </Item>
        <Item
          key="lossyCompression"
          parentItem
          title="Lossy GIF compression"
          subtitle="Smaller file size for a minor quality degradation."
        >
          <Switch
            tabIndex={tabIndex}
            checked={lossyCompression}
            onClick={() => toggleSetting('lossyCompression')}
          />
        </Item>
      </Category>
    );
  }
}

General.propTypes = {
  showCursor: PropTypes.bool,
  highlightClicks: PropTypes.bool,
  record60fps: PropTypes.bool,
  enableShortcuts: PropTypes.bool,
  toggleSetting: PropTypes.elementType.isRequired,
  toggleRecordAudio: PropTypes.elementType.isRequired,
  audioInputDeviceId: PropTypes.string,
  setAudioInputDeviceId: PropTypes.elementType.isRequired,
  audioDevices: PropTypes.array,
  recordAudio: PropTypes.bool,
  recordSystemAudio: PropTypes.bool,
  kapturesDir: PropTypes.string,
  openOnStartup: PropTypes.bool,
  allowAnalytics: PropTypes.bool,
  loopExports: PropTypes.bool,
  pickKapturesDir: PropTypes.elementType.isRequired,
  setOpenOnStartup: PropTypes.elementType.isRequired,
  updateShortcut: PropTypes.elementType.isRequired,
  toggleShortcuts: PropTypes.elementType.isRequired,
  category: PropTypes.string,
  shortcutMap: PropTypes.object,
  shortcuts: PropTypes.object,
  hardwareAcceleratedExports: PropTypes.bool,
  lossyCompression: PropTypes.bool
};

export default connect(
  [PreferencesContainer],
  ({
    showCursor,
    highlightClicks,
    record60fps,
    recordAudio,
    recordSystemAudio,
    enableShortcuts,
    audioInputDeviceId,
    audioDevices,
    kapturesDir,
    openOnStartup,
    allowAnalytics,
    loopExports,
    category,
    hardwareAcceleratedExports,
    lossyCompression,
    shortcuts,
    shortcutMap
  }) => ({
    showCursor,
    highlightClicks,
    record60fps,
    recordAudio,
    recordSystemAudio,
    enableShortcuts,
    audioInputDeviceId,
    audioDevices,
    kapturesDir,
    openOnStartup,
    allowAnalytics,
    loopExports,
    category,
    hardwareAcceleratedExports,
    lossyCompression,
    shortcuts,
    shortcutMap
  }),
  ({
    toggleSetting,
    toggleRecordAudio,
    setAudioInputDeviceId,
    pickKapturesDir,
    setOpenOnStartup,
    updateShortcut,
    toggleShortcuts
  }) => ({
    toggleSetting,
    toggleRecordAudio,
    setAudioInputDeviceId,
    pickKapturesDir,
    setOpenOnStartup,
    updateShortcut,
    toggleShortcuts
  })
)(General);
