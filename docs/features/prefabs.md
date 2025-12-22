# Prefabs

Prefabs are a way to create reusable components. Every prefab is a Container that can be added to other Prefabs.


## Serialization

Prefabs are serialized as a YAML files.

We use YAML over JSON because it's easier to deal with when using VCS (e.g. Git).

Unity also uses YAML for their prefabs. So it's a time-proven format. [link](https://unity.com/blog/engine-platform/understanding-unitys-serialization-language-yaml)

Consider using merge tools that are aware of YAML. e.g. [UnityYAMLMerge](https://docs.unity3d.com/Manual/SmartMerge.html)


## Prefab Content

Content of a prefab is a **flat** list of children. Each child refers to its parent via a `parentId` field.

We don't use a tree structure because it makes versioning and diffing harder.

Every child uses the id that (almost) never changes. It allows to keep the same order of children even when the structure of a prefab is changed. By keeping the order we can make diffs very concise.