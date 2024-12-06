import { mockAssets } from "../../data/mockAssets";

export const buildAssetTree = async (
  absoluteFilepaths: string[],
  baseDir: string,
): Promise<AssetTreeData> => {
  return mockAssets;
};
