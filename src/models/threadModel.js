const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getAllThreads = async () => {
	return prisma.thread.findMany({
		include: {
			author: {
				include: {
					profile: true,
				},
			},
			likedBy: true,
			replies: {
				include: {
					likedBy: true,
					replies: true,
				},
			},
			tags: true,
		},
	});
};

const getAllPosts = async () => {
	return prisma.thread.findMany({
		where: {
			replyTo: null,
		},
		include: {
			author: {
				include: {
					profile: true,
				},
			},
			likedBy: true,
			replies: {
				include: {
					likedBy: true,
					replies: true,
				},
			},
			tags: true,
		},
	});
};

const getRepliesByThread = ({ id }) => {
	return prisma.thread.findMany({
		where: {
			replyToId: id,
		},
	});
};

const getThreadById = async ({ id }) => {
	return prisma.thread.findUnique({
		where: {
			id,
		},
		include: {
			author: {
				include: {
					profile: true,
				},
			},
			likedBy: true,
			replies: {
				include: {
					author: {
						include: {
							profile: true,
						},
					},
					likedBy: true,
					replies: {
						include: {
							author: {
								include: {
									profile: true,
								},
							},
							likedBy: true,
							replies: true,
						},
					},
				},
			},
			tags: true,
		},
	});
};

const createPost = async ({ title, authorId, content, category, tags }) => {
	return prisma.thread.create({
		data: {
			title,
			authorId,
			content,
			category,
			tags: {
				connectOrCreate: tags.map((tag) => {
					return {
						where: { name: tag.name },
						create: { name: tag.name },
					};
				}),
			},
		},
	});
};

const createThread = async ({ authorId, content, replyToId }) => {
	const thread = await prisma.thread.findUnique({
		where: {
			id: replyToId,
		},
	});

	if (!thread) {
		throw new Error(`Thread [${replyToId}] not found to reply to`);
	}

	return prisma.thread.create({
		data: {
			authorId,
			content,
			replyToId,
			category: thread.category,
			tags: thread.tags,
		},
		include: {
			author: {
				include: {
					profile: true,
				},
			},
			likedBy: true,
			replies: {
				include: {
					author: {
						include: {
							profile: true,
						},
					},
					likedBy: true,
					replies: true,
				},
			},
			tags: true,
		},
	});
};

const likeThread = async ({ threadId, userId }) => {
	const thread = await prisma.thread.findUnique({
		where: {
			id: threadId,
		},
		include: {
			likedBy: true,
		},
	});

	if (thread.likedBy.some((user) => user.id === userId)) {
		throw new Error(`User [${userId}] has already liked thread [${threadId}]`);
	}

	return prisma.thread.update({
		where: {
			id: threadId,
		},
		data: {
			likeCount: {
				increment: 1,
			},
			likedBy: {
				connect: { id: userId },
			},
		},
	});
};

const unlikeThread = async ({ threadId, userId }) => {
	const thread = await prisma.thread.findUnique({
		where: {
			id: threadId,
		},
		include: {
			likedBy: true,
		},
	});

	if (!thread.likedBy.some((user) => user.id === userId)) {
		throw new Error(`User [${userId}] has not liked thread [${threadId}]`);
	}

	return prisma.thread.update({
		where: {
			id: threadId,
		},
		data: {
			likeCount: {
				decrement: 1,
			},
			likedBy: {
				disconnect: { id: userId },
			},
		},
	});
};

const deleteThread = async ({ id }) => {
	const thread = await prisma.thread.findUnique({
		where: {
			id,
		},
		include: {
			replies: true,
		},
	});

	if (thread.replyToId === null) {
		return prisma.thread.delete({
			where: {
				id,
			},
		});
	} else {
		if (thread.replies.length) {
			return prisma.thread.update({
				where: {
					id,
				},
				data: {
					deleted: !thread.deleted,
				},
			});
		} else {
			return prisma.thread.delete({
				where: {
					id,
				},
			});
		}
	}
};

// const deleteReply = async ({ id }) => {
//     return prisma.thread.delete({
//         where: {
//             id,
//         },
//     });
// };

const deleteReply = async ({ id }) => {
	const thread = await prisma.thread.findUnique({
		where: {
			id,
		},
	});

	if (thread.replyToId === null) {
		return prisma.thread.delete({
			where: {
				id,
			},
		});
	} else {
		if (thread.replies.length) {
			return prisma.thread.update({
				where: {
					id,
				},
				data: {
					deleted: !thread.deleted,
				},
			});
		} else {
			return prisma.thread.delete({
				where: {
					id,
				},
			});
		}
	}
};

// Home-Specific Routes
const getMostRecentPosts = async () => {
	try {
		// Fetch the two most recent threads
		const recentThreads = await prisma.thread.findMany({
			where: {
				replyToId: null,
			},
			orderBy: {
				createdAt: "desc",
			},
			take: 2, // Limit the result to 2 threads
			include: {
				author: {
					include: {
						profile: true,
					},
				},
				likedBy: true,
			},
		});

		return recentThreads;
	} catch (error) {
		console.error("Error fetching recent threads:", error);
		throw new Error("Unable to fetch recent threads.");
	}
};

module.exports = {
	getAllThreads,
	getAllPosts,
	getRepliesByThread,
	getThreadById,
	createPost,
	createThread,
	likeThread,
	unlikeThread,
	deleteThread,
	getMostRecentPosts,
	deleteReply,
};
