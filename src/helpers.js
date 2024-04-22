import { open } from '@tauri-apps/api/shell';
import { invoke } from '@tauri-apps/api/tauri';

export function useSecondsToTimeStr(seconds) {
  if (typeof seconds === 'string') {
    // expect format 'XXXX.XXXXXX'
    if (/^\s\d+\.\d+\s*$/.test(seconds)) return null;
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
    await open(dir);
  } catch (e1) {
    try {
      let homeDir = await invoke('get_home_dir');
      await open(homeDir);
    } catch (e2) {
      window.alert(`Failed to open "${dir}": ${e1}${"\n"}Failed to open "/": ${e2}`);
    }
  }
}

export function useShowInExplorer(path) {
  invoke('show_in_folder', {path});
}