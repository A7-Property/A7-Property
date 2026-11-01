# Homepage slideshow images

Save your uploaded JPG, PNG, or WebP images here. Update the single ordered
`HERO_SLIDES` array in `lib/hero-slides.ts` using URLs such as
`/images/hero/mandalay.jpg`. Add, remove, or reorder entries there.

Until uploads are saved, the slideshow uses four existing hero assets.
The chat attachments have not been copied into this directory.

Slides advance every 10 seconds and fade for 1 second. Unloaded or broken images
are skipped. Reduced-motion users see instant changes. The first image is
server-rendered and preloaded; subsequent images load eagerly before rotation.

Images are centered and cropped to cover the existing hero dimensions. Portrait
posters with embedded text will be cropped on wide screens; landscape photos
without embedded headings work best behind the existing hero text and search.
