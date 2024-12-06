export type AssetTreeData = AssetTreeItemData[];

export type AssetTreeItemData =
  | AssetTreeFolderData
  | AssetTreeFileData
  | AssetTreeJsonData
  | AssetTreeXmlData
  | AssetTreeImageData
  | AssetTreePrefabData
  | AssetTreeWebFontData
  | AssetTreeBitmapFontData
  | AssetTreeSpritesheetData
  | AssetTreeSpritesheetFrameData
  | AssetTreeSpritesheetFolderData;

// Common types
export type AssetTreeFolderData = {
  type: 'folder';
  name: string;
  path: string;
  children: AssetTreeItemData[];
};

export type AssetTreeFileData = {
  type: 'file';
  name: string;
  path: string;
};

// Specific types
export type AssetTreeJsonData = {
  type: 'json';
  name: string;
  path: string;
};

export type AssetTreeXmlData = {
  type: 'xml';
  name: string;
  path: string;
};

export type AssetTreeImageData = {
  type: 'image';
  name: string;
  path: string;
  size: { w: number; h: number };
};

export type AssetTreePrefabData = {
  type: 'prefab';
  name: string;
  path: string;
};

export type AssetTreeWebFontData = {
  type: 'web-font';
  name: string;
  path: string;
};

export type AssetTreeBitmapFontData = {
  type: 'bitmap-font';
  name: string;
  path: string;
  image: AssetTreeImageData;
  data: AssetTreeJsonData | AssetTreeXmlData;
};

export type AssetTreeSpritesheetData = {
  type: 'spritesheet';
  name: string;
  path: string;
  image: AssetTreeImageData;
  json: AssetTreeJsonData;
  frames: (AssetTreeSpritesheetFrameData | AssetTreeSpritesheetFolderData)[];
  project?: string;
};

// virtual folder
export type AssetTreeSpritesheetFolderData = {
  type: 'spritesheet-folder';
  name: string;
  path: string;
  children: AssetTreeSpritesheetFrameData[];
};

export type AssetTreeSpritesheetFrameData = {
  type: 'spritesheet-frame';
  name: string;
  path: string;
  size: { w: number; h: number };
};
