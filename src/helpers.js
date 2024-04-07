// import { isProxy, toRaw } from 'vue';
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
    + (minutes + '').padStart(2, '0')
    + ':'
    + (seconds + '').padStart(2, '0');
}

// export function useRawFromProxy(val) {
//   return isProxy(val) ? toRaw(val) : val;
// }

// https://youmightnotneed.com/lodash
export function useGet(obj, path, defValue = null) {
  if (!path) return undefined;
  let pathArray;
  if (Array.isArray(path)) {
    pathArray = path;
  } else {
    if (typeof path !== 'string') {
      path = path + '';
    }
    pathArray = path.match(/([^[.\]])+/g);
  }
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

export async function useSaveToDB(store, item, fields, setUpdatedAt = true) {
  if (!store.db) return false;
  if (!fields.length) return false;
  let response, query;
  let params = [];
  const now = Math.round(Date.now() / 1000);
  if (item.id) {
    query = `UPDATE ${item.table_name} SET `;
    let fieldStrs = [];
    for (const field of fields) {
      fieldStrs.push(`${field}=?`);
      params.push(item[field]);
    }
    if (setUpdatedAt) {
      fieldStrs.push('updated_at=?');
      params.push(now);
    }
    params.push(item.id);
    query = query + fieldStrs.join(', ') + ' WHERE id=?';
    response = await store.db.execute(query, params);
  } else {
    params.push(now, now);
    for (const field of fields) {
      params.push(item[field]);
    }
    const qMarks = Array(params.length).fill('?');
    query = `INSERT INTO ${item.table_name} (created_at, updated_at, ${fields.join(', ')}) VALUES (${qMarks})`;
    response = await store.db.execute(query, params);
    item.id = parseInt(response.lastInsertId);
    item.setSlug();
  }
  return response;
}