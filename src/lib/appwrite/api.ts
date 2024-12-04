import { ID, ImageGravity, Query } from 'appwrite';

import { INewPost, INewUser, IUpdatePost } from '@/types';
import { account, appWriteConfig, avatars, databases, storage } from './config';

export async function saveUserToDB(user: {
  accountId: string;
  name: string;
  email: string;
  imageUrl: URL;
  username?: string;
}) {
  try {
    const newUser = databases.createDocument(
      appWriteConfig.databaseId,
      appWriteConfig.userCollectionId,
      ID.unique(),
      user
    );

    return newUser;
  } catch (error) {
    console.log(error);
  }
}


export async function createUserAccount(user: INewUser) {
  try {
    const newAccount = await account.create(
      ID.unique(),
      user.email,
      user.password,
      user.name
    );

    if (!newAccount) throw Error;

    const avatarUrl = avatars.getInitials(user.name);

    const newUser = saveUserToDB({
      accountId: newAccount.$id,
      name: newAccount.name,
      email: newAccount.email,
      username: user.username,
      imageUrl: avatarUrl,
    });

    return newUser;
  } catch (error) {
    console.log(error);
    return error;
  }
}

export async function signInAccount(user:{email: string, password: string}) {
  try {
    const session = await account.createEmailPasswordSession(user.email, user.password)

    return session
  } catch (e) {
    console.log(e)
  }
}

export async function getCurrentUser() {
  try {
    const currentAccount = await account.get()

    if (!currentAccount) throw Error

    const currentUser = await databases.listDocuments(
      appWriteConfig.databaseId,
      appWriteConfig.userCollectionId,
      [Query.equal('accountId', currentAccount.$id)]
    )

    if (!currentUser) throw Error

    return currentUser.documents[0]
  } catch (e) {
    console.log(e)
  }
}

export async function signOutAccount() {
  try {
    const session = account.deleteSession('current')

    return session
  } catch (e) {
    console.log(e)
  }
}

export async function createPost(post: INewPost) {
  try {
    //Upload image to storage
    const uploadedFile = await uploadFile(post.file[0])

    if (!uploadedFile) throw Error

    // Get file Url
    const fileUrl = getFilePreview(uploadedFile.$id)

    if (!fileUrl) {
      deleteFile(uploadedFile.$id)
      throw Error
    }

    //Convert tags in an array
    const tags = post.tags?.replace(/ /g,'').split(',') || []

    //Save post to DB
    const newPost = await databases.createDocument(
      appWriteConfig.databaseId,
      appWriteConfig.postCollectionId,
      ID.unique(),
      {
        creator: post.userId,
        caption: post.caption,
        imageUrl: fileUrl,
        imageId: uploadedFile.$id,
        location: post.location,
        tags: tags
      }
    )

    if (!newPost) {
      deleteFile(uploadedFile.$id)
      throw Error
    }

    return newPost
  } catch (e) {
    console.log(e)
  }
}

export async function uploadFile(file: File) {
  try {
    const uploadedFile = await storage.createFile(
      appWriteConfig.storageID,
      ID.unique(),
      file
    )

    return uploadedFile
  } catch (e) {
    console.log(e)
  }
}

export function getFilePreview(fileId:string) {
  try {
    const fileUrl = storage.getFilePreview(
      appWriteConfig.storageID,
      fileId,
      2000,
      2000,
      ImageGravity.Center,
      100
    )

    return fileUrl
  } catch (e) {
    console.log(e)
  }
}

export async function deleteFile(fileId:string) {
  try {
    await storage.deleteFile(appWriteConfig.storageID, fileId)

    return {status: 'ok'}
  } catch (e) {
    console.log(e)
  }
}

export async function getRecentPosts() {
  const posts = await databases.listDocuments(
    appWriteConfig.databaseId,
    appWriteConfig.postCollectionId,
    [Query.orderDesc('$createdAt'), Query.limit(20)]
  )

  if (!posts) throw Error

  return posts
}

export async function likePost(postId: string, likesArray: string[]) {
  try {
    const updatedPost = await databases.updateDocument(
      appWriteConfig.databaseId,
      appWriteConfig.postCollectionId,
      postId,
      {likes: likesArray}
    )

    if (!updatedPost) throw Error

    return updatedPost
  } catch (e) {
    console.log(e)
  }
}

export async function savePost(postId: string, userId: string) {
  try {
    const updatedPost = await databases.createDocument(
      appWriteConfig.databaseId,
      appWriteConfig.savesCollectionId,
      ID.unique(),
      {user: userId, post: postId}
    )

    if (!updatedPost) throw Error

    return updatedPost
  } catch (e) {
    console.log(e)
  }
}

export async function deleteSavedPost(savedRecordId: string) {
  try {
    const statusCode = await databases.deleteDocument(
      appWriteConfig.databaseId,
      appWriteConfig.savesCollectionId,
      savedRecordId
    )

    if (!statusCode) throw Error

    return {status: 'ok'}
  } catch (e) {
    console.log(e)
  }
}

export async function getPostsById(postId: string) {
  try {
    const post = await databases.getDocument(
      appWriteConfig.databaseId,
      appWriteConfig.postCollectionId,
      postId
    )

    if(!post) throw Error

    return post
  } catch (e) {
    console.log(e)
  }
}

export async function updatePost(post: IUpdatePost) {
  const hasFileToUpdate = post.file.length > 0

  try {
    let image = {
      imageId: post.imageId,
      imageUrl: post.imageUrl
    }

    if(hasFileToUpdate) {
      //Upload image to storage
      const uploadedFile = await uploadFile(post.file[0])
  
      if (!uploadedFile) throw Error
  
      // Get file Url
      const fileUrl = getFilePreview(uploadedFile.$id)
  
      if (!fileUrl) {
        deleteFile(uploadedFile.$id)
        throw Error
      }

      image = {...image, imageId: uploadedFile.$id, imageUrl: fileUrl}
    }
    //Convert tags in an array
    const tags = post.tags?.replace(/ /g,'').split(',') || []

    //Save post to DB
    const updatedPost = await databases.updateDocument(
      appWriteConfig.databaseId,
      appWriteConfig.postCollectionId,
      post.postId,
      {
        caption: post.caption,
        imageUrl: image.imageUrl,
        imageId: image.imageId,
        location: post.location,
        tags: tags
      }
    )

    if (!updatedPost) {
      deleteFile(post.postId)
      throw Error
    }

    return updatedPost

  } catch (e) {
    console.log(e)
  }
}

export async function deletePost(postId: string, imageId: string, userId: string) {
  if(!postId || !imageId) throw Error

  try {
    const saves =  await databases.listDocuments(
      appWriteConfig.databaseId,
      appWriteConfig.savesCollectionId,
      [Query.equal('user', userId)]
    )
    const deletingSave = saves.documents.find(record => record.post?.$id === postId)
    console.log(deletingSave?.$id)
    
    if(deletingSave) {
      deleteSavedPost(deletingSave.$id)
    }
    
    await databases.deleteDocument(
      appWriteConfig.databaseId,
      appWriteConfig.postCollectionId,
      postId
    )

    deleteFile(imageId)

    return {status: 'ok'}
  } catch (e) {
    console.log(e)
  }
}

// export async function getInfinitePosts({ pageParam }: { pageParam?: number }) {
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   const queries: any[] = [Query.orderDesc('$updatedAt'), Query.limit(10)];

//   if (pageParam) {
//     queries.push(Query.cursorAfter(pageParam.toString()));
//   }

//   try {
//     const posts = await databases.listDocuments(
//       appWriteConfig.databaseId,
//       appWriteConfig.postCollectionId,
//       queries
//     );
//     if (!posts) throw new Error('Failed to fetch posts');

//     return posts;
//   } catch (e) {
//     console.error(e);
//     throw e; // Let React Query handle the error
//   }
// }

export async function searchPosts(searchTerm: string) {
  

  try {
    const posts = databases.listDocuments(
      appWriteConfig.databaseId,
      appWriteConfig.postCollectionId,
      [Query.search('caption', searchTerm)]
    )
    if(!posts) throw Error

    return posts
  } catch (e) {
    console.log(e)
  }
}