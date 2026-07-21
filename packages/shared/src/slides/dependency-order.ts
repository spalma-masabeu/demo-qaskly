export interface SlideDependency {
  id: string;
  dependencies: string[];
}

export function expandDependencies(
  slideId: string,
  slides: ReadonlyMap<string, SlideDependency>
): string[] {
  const slide = slides.get(slideId);
  if (!slide) return [];

  return [
    slide.id,
    ...slide.dependencies.flatMap((dependencyId) =>
      expandDependencies(dependencyId, slides)
    ),
  ];
}
