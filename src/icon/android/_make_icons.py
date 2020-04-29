from PIL import Image

INPUT_PICT = "base.png"

def resize(base_img, area_length, image_name):
    resized_image = base_img.resize((area_length, area_length))
    resized_image.save(image_name)


base_img = Image.open(INPUT_PICT)

resize(base_img, 36, 'ldpi.png')
resize(base_img, 48, 'mdpi.png')
resize(base_img, 72, 'hdpi.png')
resize(base_img, 96, 'xhdpi.png')
resize(base_img, 144, 'xxhdpi.png')
resize(base_img, 192, 'xxxhdpi.png')
