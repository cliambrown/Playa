import { openPath } from '@tauri-apps/plugin-opener';
import { invoke } from '@tauri-apps/api/core';
import { Command } from '@tauri-apps/plugin-shell';

export async function useGetDuration(pathname) {
  let output;
  try {
    output = await Command.create('ffprobe', [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        pathname,
      ])
      .execute();
  } catch(error) {
    window.alert('Error while getting episode duration with ffprobe: ' + error);
    console.log('useGetDuration', null);
    return null;
  }
  if (!output) {
    window.alert('Unknown error while getting episode duration with ffprobe: no output');
  } else if (output.stderr && output.stderr !== '') {
    window.alert('Error while getting episode duration with ffprobe: ' + output.stderr);
  } else if (output.code !== 0 || output.signal !== null) {
    window.alert('Error while getting episode duration with ffprobe: code = ' + output.code + '; signal = ' + output.signal);
  } else if (!output.stdout) {
    window.alert('Error while getting episode duration with ffprobe: no stdout');
  } else {
    const duration = useSecondsToTimeStr(output.stdout);
    console.log('useGetDuration', duration);
    return duration;
  }
  console.log('useGetDuration', null);
  return null;
}

export function useSecondsToTimeStr(seconds) {
  if (typeof seconds === 'string') {
    // expect format 'XXXX.XXXXXX'
    if (!/^\s*\d+(\.\d+)?\s*$/.test(seconds)) return null;
    const parts = seconds.split('.');
    seconds = parseInt(parts[0].trim());
  } else {
    seconds = parseInt(seconds);
  }
  if (isNaN(seconds)) return null;
  let timeStr = '';
  const hours = Math.floor(seconds / 60 / 60);
  if (hours >= 1) timeStr = hours + ':';
  seconds = seconds - (hours * 60 * 60);
  const minutes = Math.floor(seconds / 60);
  seconds = seconds - (minutes * 60);
  return timeStr
    + ((hours >= 1) ? (minutes + '').padStart(2, '0') : minutes)
    + ':'
    + (seconds + '').padStart(2, '0');
}

export function useMinutesToTimeStr(minutes) {
  minutes = parseInt(minutes);
  if (isNaN(minutes)) return null;
  return useSecondsToTimeStr(minutes * 60);
}

// export function useRawFromProxy(val) {
//   return isProxy(val) ? toRaw(val) : val;
// }

export function useGetProp(obj, propName, defValue = null) {
  const result = obj[propName];
  return result === undefined ? defValue : result;
}

function getPathArrayFromPath(path) {
  if (Array.isArray(path)) return path;
  if (typeof path !== 'string') path = path + '';
  return path.match(/([^[.\]])+/g);
}

// https://youmightnotneed.com/lodash#get
export function useGet(obj, path, defValue = null) {
  if (!path) return undefined;
  let pathArray = getPathArrayFromPath(path);
  const result = pathArray.reduce(
    (prevObj, key) => prevObj && prevObj[key],
    obj
  );
  return result === undefined ? defValue : result;
}

export function useSlugify(str, seperator = '-') {
  if (!str) str = '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, seperator)
    .replace(/^-+|-+$/g, '')
    .trim();
}

export function useAlphaName(name) {
  name = useSlugify(name, ' ');
  if (name.startsWith('the ')) name = name.slice(4);
  if (name.startsWith('a ')) name = name.slice(2);
  if (name.startsWith('an ')) name = name.slice(3);
  return name.trim();
}

export async function useOpenOrHomeDir(dir) {
  try {
    await openPath(dir);
  } catch (e1) {
    try {
      let homeDir = await invoke('get_home_dir');
      await openPath(homeDir);
    } catch (e2) {
      window.alert(`Failed to open "${dir}": ${e1}${"\n"}Failed to open "/": ${e2}`);
    }
  }
}

export function useShowInExplorer(path) {
  invoke('show_in_folder', {path});
}

export function isYoutubeUrl(urlString) {
  if (!urlString || typeof urlString !== 'string') return false;
  let url = null;
  try {
    url = new URL(urlString);
  } catch (error) {
    return false;
  }
  let domain = url.hostname;
  if (domain.indexOf('www.') === 0) domain = domain.substring(4);
  switch (domain) {
    case 'youtube.com':
    case 'youtube.ca':
    case 'youtu.be':
    case 'youtube.googleapis.com':
    case 'yt.be':
      return true;
      break;
    default:
      return false;
  }
}