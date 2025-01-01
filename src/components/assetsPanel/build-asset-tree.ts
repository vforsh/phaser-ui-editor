import { mockAssets } from "../../data/mockAssets";
import { AssetTreeData } from "../../types/assets";

export const buildAssetTree = async (
  absoluteFilepaths: string[],
  baseDir: string,
): Promise<AssetTreeData> => {
  // @ts-expect-error
  return mockAssets;
};
