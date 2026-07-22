import OptionsContainer from 'components/editor/options-container';
import {ExportDestination, Format} from 'common/types';
import {useMemo} from 'react';

type Destination = {
  destination: ExportDestination;
  app?: ReturnType<typeof OptionsContainer.useContainer>['app'];
};

const destinationValue = (destination: ExportDestination, app?: Destination['app']): Destination => ({destination, app});

const useExportDestinations = () => {
  const {
    formats,
    format,
    destination,
    app,
    updateDestination
  } = OptionsContainer.useContainer();

  const menuOptions = useMemo(() => {
    const apps = formats.find(option => option.format === format)?.apps ?? [];
    const options: any[] = [{
      label: 'Save to Disk',
      checked: destination === 'save',
      value: destinationValue('save')
    }];

    if ([Format.gif, Format.apng, Format.mp4].includes(format)) {
      options.push({
        label: 'Copy to Clipboard',
        checked: destination === 'copy',
        value: destinationValue('copy')
      });
    }

    if (apps.length > 0) {
      const subMenu: any[] = apps.map(candidate => ({
        label: candidate.isDefault ? `${candidate.name} (default)` : candidate.name,
        type: 'radio',
        checked: destination === 'open' && app?.url === candidate.url,
        value: destinationValue('open', candidate),
        icon: candidate.icon
      }));

      if (apps[0].isDefault) {
        subMenu.splice(1, 0, {type: 'separator'});
      }

      options.push({
        label: 'Open With…',
        checked: destination === 'open',
        subMenu,
        value: destinationValue('open', apps[0])
      });
    }

    return options;
  }, [formats, format, destination, app]);

  const destinationLabels: Record<Exclude<ExportDestination, 'open'>, string> = {
    copy: 'Copy to Clipboard',
    save: 'Save to Disk'
  };
  const label = destination === 'open' ? app?.name : destinationLabels[destination];

  return {menuOptions, label, onChange: updateDestination};
};

export default useExportDestinations;
