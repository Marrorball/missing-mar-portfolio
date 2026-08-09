#import <Foundation/Foundation.h>
#import <Vision/Vision.h>
#import <CoreImage/CoreImage.h>
#import <ImageIO/ImageIO.h>
#import <UniformTypeIdentifiers/UniformTypeIdentifiers.h>

static BOOL WritePNG(CGImageRef image, NSURL *url) {
    CGImageDestinationRef destination = CGImageDestinationCreateWithURL((__bridge CFURLRef)url, (__bridge CFStringRef)UTTypePNG.identifier, 1, NULL);
    if (destination == NULL) return NO;
    CGImageDestinationAddImage(destination, image, NULL);
    BOOL written = CGImageDestinationFinalize(destination);
    CFRelease(destination);
    return written;
}

int main(int argc, const char *argv[]) {
    @autoreleasepool {
        if (argc != 3) {
            fprintf(stderr, "Usage: extract-foreground <input-image> <output-directory>\n");
            return 2;
        }

        NSURL *inputURL = [NSURL fileURLWithPath:[NSString stringWithUTF8String:argv[1]]];
        NSURL *outputURL = [NSURL fileURLWithPath:[NSString stringWithUTF8String:argv[2]] isDirectory:YES];
        [[NSFileManager defaultManager] createDirectoryAtURL:outputURL withIntermediateDirectories:YES attributes:nil error:nil];

        CGImageSourceRef source = CGImageSourceCreateWithURL((__bridge CFURLRef)inputURL, NULL);
        if (source == NULL) return 3;
        CGImageRef image = CGImageSourceCreateImageAtIndex(source, 0, NULL);
        CFRelease(source);
        if (image == NULL) return 4;

        VNImageRequestHandler *handler = [[VNImageRequestHandler alloc] initWithCGImage:image orientation:kCGImagePropertyOrientationUp options:@{}];
        VNGenerateForegroundInstanceMaskRequest *request = [VNGenerateForegroundInstanceMaskRequest new];
        NSError *error = nil;
        if (![handler performRequests:@[request] error:&error]) {
            fprintf(stderr, "%s\n", error.localizedDescription.UTF8String);
            CGImageRelease(image);
            return 5;
        }

        VNInstanceMaskObservation *observation = request.results.firstObject;
        if (observation == nil) {
            CGImageRelease(image);
            return 6;
        }

        CIContext *context = [CIContext contextWithOptions:nil];
        __block int writeFailure = 0;
        [observation.allInstances enumerateIndexesUsingBlock:^(NSUInteger instance, BOOL *stop) {
            NSError *maskError = nil;
            CVPixelBufferRef buffer = [observation generateScaledMaskForImageForInstances:[NSIndexSet indexSetWithIndex:instance] fromRequestHandler:handler error:&maskError];
            if (buffer == NULL) {
                writeFailure = 7;
                return;
            }
            CIImage *mask = [CIImage imageWithCVPixelBuffer:buffer];
            CGImageRef maskImage = [context createCGImage:mask fromRect:mask.extent];
            CFRelease(buffer);
            if (maskImage == NULL) {
                writeFailure = 8;
                return;
            }
            NSURL *maskURL = [outputURL URLByAppendingPathComponent:[NSString stringWithFormat:@"foreground-%lu.png", (unsigned long)instance]];
            if (!WritePNG(maskImage, maskURL)) writeFailure = 9;
            CGImageRelease(maskImage);
        }];

        printf("instances=%lu\n", (unsigned long)observation.allInstances.count);
        CGImageRelease(image);
        return writeFailure;
    }
}
